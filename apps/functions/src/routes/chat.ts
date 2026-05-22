import { Router } from 'express';
import { db } from '../lib/documents.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';
import {
  chatRoomParamsSchema,
  createConversationSchema,
  sendMessageSchema,
} from '../schemas/chat.js';

const router: Router = Router();

type ChatUser = NonNullable<Express.Request['user']>;

type ConversationRecord = {
  participants?: string[];
  type?: 'direct' | 'group';
  name?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  schoolId?: string | null;
  tenantId?: string;
};

type MessageRecord = {
  senderId?: string;
  senderName?: string;
  text?: string;
  sentAt?: string;
  readBy?: string[];
  status?: string;
  schoolId?: string | null;
  tenantId?: string;
};

type UserRecord = {
  role?: string;
  roles?: string[];
  classId?: string;
  classIds?: string[];
  linkedStudentIds?: string[];
  tenantId?: string;
  schoolId?: string | null;
};

function directConversationId(left: string, right: string) {
  return `direct_${[left, right].sort().join('_')}`;
}

function displayName(user: ChatUser) {
  return user.displayName || user.email || 'EduConnect user';
}

function isTenantRecord(
  record: Pick<ConversationRecord | UserRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return record.tenantId === tenantId || record.schoolId === tenantId;
}

function getClassIds(user: Pick<ChatUser | UserRecord, 'classId' | 'classIds'>) {
  return user.classIds || (user.classId ? [user.classId] : []);
}

async function canMessageUser(
  currentUser: ChatUser,
  targetUserId: string,
  tenantId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const currentRole = currentUser.role;

  if (currentRole === 'admin' || currentRole === 'principal' || currentUser.isAdmin) {
    return { allowed: true, reason: 'Admin/Principal access' };
  }

  const targetDoc = await db.collection('users').doc(targetUserId).get();

  if (!targetDoc.exists) {
    return { allowed: false, reason: 'Target user not found' };
  }

  const targetData = (targetDoc.data() || {}) as UserRecord;

  if (!isTenantRecord(targetData, tenantId)) {
    return { allowed: false, reason: 'Target user is not in this school' };
  }

  const targetRole = targetData.role || targetData.roles?.[0] || '';
  const targetClassIds = getClassIds(targetData);
  const currentClassIds = getClassIds(currentUser);

  if (currentRole === 'student') {
    if (targetRole === 'teacher') {
      const hasSharedClass = targetClassIds.some((classId) => currentClassIds.includes(classId));
      if (hasSharedClass) return { allowed: true, reason: 'Class Teacher' };
    }

    if (targetRole === 'principal' || targetRole === 'admin') {
      return { allowed: true, reason: 'Administration' };
    }

    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  if (currentRole === 'parent') {
    if (targetRole === 'teacher') {
      const hasLinkedStudentClass = targetClassIds.some((classId) =>
        currentClassIds.includes(classId)
      );
      if (hasLinkedStudentClass) return { allowed: true, reason: "Child's Teacher" };
    }

    if (targetRole === 'principal' || targetRole === 'admin') {
      return { allowed: true, reason: 'Administration' };
    }

    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  if (currentRole === 'teacher') {
    if (targetRole === 'student') {
      const hasSharedClass = targetClassIds.some((classId) => currentClassIds.includes(classId));
      if (hasSharedClass) return { allowed: true, reason: 'Your Student' };
    }

    if (targetRole === 'parent') {
      const targetLinkedStudents = targetData.linkedStudentIds || [];
      const hasLinkedStudent = targetLinkedStudents.length > 0 && currentClassIds.length > 0;
      if (hasLinkedStudent) return { allowed: true, reason: "Student's Parent" };
    }

    if (targetRole === 'principal' || targetRole === 'admin' || targetRole === 'teacher') {
      return { allowed: true, reason: 'Colleague' };
    }

    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  if (currentRole === 'librarian') {
    if (targetRole === 'admin' || targetRole === 'principal') {
      return { allowed: true, reason: 'Administration' };
    }

    if (targetRole === 'student' || targetRole === 'parent') {
      return { allowed: true, reason: 'Library Services' };
    }

    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  if (currentRole === 'accountant') {
    if (targetRole === 'admin' || targetRole === 'principal') {
      return { allowed: true, reason: 'Administration' };
    }

    if (targetRole === 'student' || targetRole === 'parent') {
      return { allowed: true, reason: 'Fee Management' };
    }

    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  return { allowed: false, reason: 'Not authorized to message this user' };
}

function assertConversationAccess(
  conversation: ConversationRecord,
  user: ChatUser,
  tenantId?: string
) {
  if (!isTenantRecord(conversation, tenantId)) {
    return { allowed: false, error: 'Tenant access denied' };
  }

  if (!conversation.participants?.includes(user.uid)) {
    return { allowed: false, error: 'You are not a participant in this conversation' };
  }

  return { allowed: true };
}

router.get('/rooms', async (req, res, next) => {
  try {
    const user = req.user!;

    const snapshot = await db
      .collection('conversations')
      .where('tenantId', '==', req.tenantId)
      .get();

    const rooms = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as ConversationRecord),
      }))
      .filter((room) => room.participants?.includes(user.uid));

    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

router.post('/conversations', async (req, res, next) => {
  try {
    const user = req.user!;
    const parsedBody = createConversationSchema.parse(req.body);
    const now = new Date().toISOString();

    if (parsedBody.type === 'direct') {
      const recipientId = parsedBody.recipientId!;

      if (recipientId === user.uid) {
        return res.status(400).json({ error: 'A valid recipientId is required' });
      }

      const eligibility = await canMessageUser(user, recipientId, req.tenantId);

      if (!eligibility.allowed) {
        logger.warn(
          { userId: user.uid, recipientId, reason: eligibility.reason },
          'Unauthorized conversation attempt'
        );

        return res
          .status(403)
          .json({ error: eligibility.reason || 'You are not authorized to message this user' });
      }

      const id = directConversationId(user.uid, recipientId);
      const ref = db.collection('conversations').doc(id);
      const snapshot = await ref.get();

      const baseConversation: ConversationRecord = {
        participants: [user.uid, recipientId],
        type: 'direct',
        name: null,
        schoolId: req.tenantId,
        tenantId: req.tenantId,
        updatedAt: now,
      };

      if (snapshot.exists) {
        const existing = (snapshot.data() || {}) as ConversationRecord;

        if (!isTenantRecord(existing, req.tenantId)) {
          return res.status(403).json({ error: 'Tenant access denied' });
        }

        await ref.update({ updatedAt: now });
        return res.json({ id, ...existing, updatedAt: now });
      }

      await ref.set({
        ...baseConversation,
        lastMessage: '',
        createdAt: now,
        createdBy: user.uid,
      });

      return res.status(201).json({
        id,
        ...baseConversation,
        lastMessage: '',
        createdAt: now,
        createdBy: user.uid,
      });
    }

    const participants = Array.from(
      new Set([user.uid, ...parsedBody.participantIds.map(String).filter(Boolean)])
    );

    if (participants.length < 2) {
      return res.status(400).json({
        error: 'Group chats require at least two participants',
      });
    }

    const ref = await db.collection('conversations').add({
      participants,
      type: 'group',
      name: parsedBody.name,
      lastMessage: '',
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    });

    res.status(201).json({
      id: ref.id,
      participants,
      type: 'group',
      name: parsedBody.name,
      lastMessage: '',
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/send', async (req, res, next) => {
  try {
    const user = req.user!;
    const { conversationId: parsedConversationId, recipientId, text } = sendMessageSchema.parse(
      req.body
    );

    const now = new Date().toISOString();
    let conversationId = parsedConversationId || '';
    let conversation: ConversationRecord;

    if (conversationId) {
      const snapshot = await db.collection('conversations').doc(conversationId).get();

      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      conversation = (snapshot.data() || {}) as ConversationRecord;

      const access = assertConversationAccess(conversation, user, req.tenantId);
      if (!access.allowed) {
        return res.status(403).json({ error: access.error });
      }
    } else {
      const targetRecipientId = recipientId!;

      if (targetRecipientId === user.uid) {
        return res.status(400).json({ error: 'recipientId is required for a new direct message' });
      }

      const eligibility = await canMessageUser(user, targetRecipientId, req.tenantId);

      if (!eligibility.allowed) {
        logger.warn(
          { userId: user.uid, recipientId: targetRecipientId, reason: eligibility.reason },
          'Unauthorized message attempt'
        );

        return res
          .status(403)
          .json({ error: eligibility.reason || 'You are not authorized to message this user' });
      }

      conversationId = directConversationId(user.uid, targetRecipientId);
      const ref = db.collection('conversations').doc(conversationId);
      const snapshot = await ref.get();

      conversation = snapshot.exists
        ? ((snapshot.data() || {}) as ConversationRecord)
        : {
            participants: [user.uid, targetRecipientId],
            type: 'direct',
            name: null,
            schoolId: req.tenantId,
            tenantId: req.tenantId,
            createdAt: now,
            createdBy: user.uid,
          };

      if (snapshot.exists && !isTenantRecord(conversation, req.tenantId)) {
        return res.status(403).json({ error: 'Tenant access denied' });
      }

      if (!snapshot.exists) {
        await ref.set({
          ...conversation,
          lastMessage: '',
          updatedAt: now,
        });
      }
    }

    const participants = Array.isArray(conversation.participants)
      ? conversation.participants
      : [user.uid];

    const messageRef = await db.collection(`conversations/${conversationId}/messages`).add({
      senderId: user.uid,
      senderName: displayName(user),
      text,
      sentAt: now,
      readBy: [user.uid],
      status: 'sent',
      schoolId: req.tenantId,
      tenantId: req.tenantId,
    } satisfies MessageRecord);

    await db.collection('conversations').doc(conversationId).update({
      lastMessage: text,
      lastMessageAt: now,
      lastSenderId: user.uid,
      updatedAt: now,
    });

    const recipients = participants.filter((participantId) => participantId !== user.uid);

    if (recipients.length > 0) {
      await createNotification({
        title: `New message from ${displayName(user)}`,
        message: text.slice(0, 180),
        type: 'chat',
        href: '/chat',
        targetUserIds: recipients,
        schoolId: req.tenantId,
        tenantId: req.tenantId,
        actorId: user.uid,
        metadata: { conversationId, messageId: messageRef.id },
      });
    }

    res.status(201).json({
      id: messageRef.id,
      conversationId,
      senderId: user.uid,
      senderName: displayName(user),
      text,
      sentAt: now,
      readBy: [user.uid],
      status: 'sent',
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/rooms/:id/read', async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = chatRoomParamsSchema.parse(req.params);

    const roomSnapshot = await db.collection('conversations').doc(id).get();

    if (!roomSnapshot.exists) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = (roomSnapshot.data() || {}) as ConversationRecord;

    const access = assertConversationAccess(conversation, user, req.tenantId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.error });
    }

    const snapshot = await db
      .collection(`conversations/${id}/messages`)
      .orderBy('sentAt', 'desc')
      .limit(100)
      .get();

    const unreadDocs = snapshot.docs.filter((doc) => {
      const data = (doc.data() || {}) as MessageRecord;
      return !data.readBy?.includes(user.uid);
    });

    const now = new Date().toISOString();

    await Promise.all(
      unreadDocs.map((doc) => {
        const currentReadBy = ((doc.data() || {}) as MessageRecord).readBy || [];

        return doc.ref.update({
          readBy: [...currentReadBy, user.uid],
          updatedAt: now,
        });
      })
    );

    res.json({ success: true, count: unreadDocs.length });
  } catch (error) {
    next(error);
  }
});

export default router;