import { Router, type Request, type Response } from 'express';
import { db } from '../lib/documents.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';

const router: Router = Router();

function requireUser(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return req.user;
}

function directConversationId(left: string, right: string) {
  return `direct_${[left, right].sort().join('_')}`;
}

function displayName(user: NonNullable<Express.Request['user']>) {
  return user.displayName || user.email || 'EduConnect user';
}

/**
 * Check if user can message another user based on role eligibility rules
 */
async function canMessageUser(
  currentUser: NonNullable<Express.Request['user']>,
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const currentRole = currentUser.role;

  // Admin and Principal can message anyone
  if (currentRole === 'admin' || currentRole === 'principal') {
    return { allowed: true, reason: 'Admin/Principal access' };
  }

  // Fetch target user profile
  const targetDoc = await db.collection('users').doc(targetUserId).get();
  if (!targetDoc.exists) {
    return { allowed: false, reason: 'Target user not found' };
  }

  const targetData = targetDoc.data() || {};
  const targetRole = targetData.role || targetData.roles?.[0] || '';
  const targetClassIds = targetData.classIds || (targetData.classId ? [targetData.classId] : []);
  const currentClassIds =
    currentUser.classIds || (currentUser.classId ? [currentUser.classId] : []);

  // Student eligibility
  if (currentRole === 'student') {
    // Can message teachers in their class
    if (targetRole === 'teacher') {
      const hasSharedClass = targetClassIds.some((classId: string) =>
        currentClassIds.includes(classId)
      );
      if (hasSharedClass) return { allowed: true, reason: 'Class Teacher' };
    }
    // Can message principal or admin
    if (targetRole === 'principal' || targetRole === 'admin') {
      return { allowed: true, reason: 'Administration' };
    }
    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  // Parent eligibility
  if (currentRole === 'parent') {
    // Can message their linked child's teachers
    if (targetRole === 'teacher') {
      const hasLinkedStudentClass = targetClassIds.some((classId: string) =>
        currentClassIds.includes(classId)
      );
      if (hasLinkedStudentClass) return { allowed: true, reason: "Child's Teacher" };
    }
    // Can message principal or admin
    if (targetRole === 'principal' || targetRole === 'admin') {
      return { allowed: true, reason: 'Administration' };
    }
    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  // Teacher eligibility
  if (currentRole === 'teacher') {
    // Can message students in assigned classes
    if (targetRole === 'student') {
      const hasSharedClass = targetClassIds.some((classId: string) =>
        currentClassIds.includes(classId)
      );
      if (hasSharedClass) return { allowed: true, reason: 'Your Student' };
    }
    // Can message parents of assigned students
    if (targetRole === 'parent') {
      const targetLinkedStudents = targetData.linkedStudentIds || [];
      // Check if any linked student is in teacher's class
      const hasLinkedStudent = targetLinkedStudents.some((_studentId: string) => {
        // This is simplified - in production you'd check if student is in teacher's class
        return currentClassIds.length > 0;
      });
      if (hasLinkedStudent) return { allowed: true, reason: "Student's Parent" };
    }
    // Can message principal/admin or other teachers
    if (targetRole === 'principal' || targetRole === 'admin' || targetRole === 'teacher') {
      return { allowed: true, reason: 'Colleague' };
    }
    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  // Librarian eligibility
  if (currentRole === 'librarian') {
    if (targetRole === 'admin' || targetRole === 'principal') {
      return { allowed: true, reason: 'Administration' };
    }
    if (targetRole === 'student' || targetRole === 'parent') {
      return { allowed: true, reason: 'Library Services' };
    }
    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  // Accountant eligibility
  if (currentRole === 'accountant') {
    if (targetRole === 'admin' || targetRole === 'principal') {
      return { allowed: true, reason: 'Administration' };
    }
    if (targetRole === 'student' || targetRole === 'parent') {
      return { allowed: true, reason: 'Fee Management' };
    }
    return { allowed: false, reason: 'Not authorized to message this user' };
  }

  // Default: deny
  return { allowed: false, reason: 'Not authorized to message this user' };
}

router.get('/rooms', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const snapshot = await db.collection('conversations').get();
    const rooms = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((room: Record<string, unknown>) =>
        (room.participants as string[])?.includes(user.uid)
      );

    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

router.post('/conversations', async (req, res, next) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const type = req.body.type === 'group' ? 'group' : 'direct';
    const now = new Date().toISOString();

    if (type === 'direct') {
      const recipientId = String(req.body.recipientId || '').trim();
      if (!recipientId || recipientId === user.uid) {
        return res.status(400).json({ error: 'A valid recipientId is required' });
      }

      // Check eligibility
      const eligibility = await canMessageUser(user, recipientId);
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
      const baseConversation = {
        participants: [user.uid, recipientId],
        type: 'direct',
        name: null,
        schoolId: user.schoolId,
        tenantId: req.tenantId,
        updatedAt: now,
      };

      if (snapshot.exists) {
        await ref.update({ updatedAt: now });
        return res.json({ id, ...snapshot.data(), updatedAt: now });
      }

      await ref.set({
        ...baseConversation,
        lastMessage: '',
        createdAt: now,
        createdBy: user.uid,
      });
      return res.status(201).json({ id, ...baseConversation, lastMessage: '', createdAt: now });
    }

    const name = String(req.body.name || '').trim();
    const participantIds = Array.isArray(req.body.participantIds) ? req.body.participantIds : [];
    const participants = Array.from(
      new Set([user.uid, ...participantIds.map(String).filter(Boolean)])
    );

    if (!name || participants.length < 2) {
      return res
        .status(400)
        .json({ error: 'Group chats require a name and at least two participants' });
    }

    const ref = await db.collection('conversations').add({
      participants,
      type: 'group',
      name,
      lastMessage: '',
      schoolId: user.schoolId,
      tenantId: req.tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    });

    res.status(201).json({
      id: ref.id,
      participants,
      type: 'group',
      name,
      lastMessage: '',
      schoolId: user.schoolId,
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
    const user = requireUser(req, res);
    if (!user) return;

    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Message text is required' });
    if (text.length > 2000) return res.status(400).json({ error: 'Message is too long' });

    const now = new Date().toISOString();
    let conversationId = String(req.body.conversationId || '').trim();
    let conversation: Record<string, unknown> | null = null;

    if (conversationId) {
      const snapshot = await db.collection('conversations').doc(conversationId).get();
      if (!snapshot.exists) return res.status(404).json({ error: 'Conversation not found' });
      conversation = (snapshot.data() as Record<string, unknown>) || {};
      if (!(conversation.participants as string[])?.includes(user.uid)) {
        return res.status(403).json({ error: 'You are not a participant in this conversation' });
      }
    } else {
      const recipientId = String(req.body.recipientId || '').trim();
      if (!recipientId || recipientId === user.uid) {
        return res.status(400).json({ error: 'recipientId is required for a new direct message' });
      }

      // Check eligibility for new conversation
      const eligibility = await canMessageUser(user, recipientId);
      if (!eligibility.allowed) {
        logger.warn(
          { userId: user.uid, recipientId, reason: eligibility.reason },
          'Unauthorized message attempt'
        );
        return res
          .status(403)
          .json({ error: eligibility.reason || 'You are not authorized to message this user' });
      }

      conversationId = directConversationId(user.uid, recipientId);
      const ref = db.collection('conversations').doc(conversationId);
      const snapshot = await ref.get();
      conversation = snapshot.exists
        ? (snapshot.data() as Record<string, unknown>) || {}
        : {
            participants: [user.uid, recipientId],
            type: 'direct',
            name: null,
            schoolId: user.schoolId,
            tenantId: req.tenantId,
            createdAt: now,
            createdBy: user.uid,
          };

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
      schoolId: user.schoolId,
      tenantId: req.tenantId,
    });

    await db.collection('conversations').doc(conversationId).update({
      lastMessage: text,
      lastMessageAt: now,
      lastSenderId: user.uid,
      updatedAt: now,
    });

    const recipients = participants.filter((participantId: string) => participantId !== user.uid);
    if (recipients.length > 0) {
      await createNotification({
        title: `New message from ${displayName(user)}`,
        message: text.slice(0, 180),
        type: 'chat',
        href: '/chat',
        targetUserIds: recipients,
        schoolId: user.schoolId,
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
    const user = requireUser(req, res);
    if (!user) return;

    const roomSnapshot = await db.collection('conversations').doc(req.params.id).get();
    if (!roomSnapshot.exists) return res.status(404).json({ error: 'Conversation not found' });

    const conversation = (roomSnapshot.data() as Record<string, unknown>) || {};
    if (!(conversation.participants as string[])?.includes(user.uid)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const snapshot = await db
      .collection(`conversations/${req.params.id}/messages`)
      .orderBy('sentAt', 'desc')
      .limit(100)
      .get();

    await Promise.all(
      snapshot.docs.map((doc) => {
        const message = (doc.data() as Record<string, unknown>) || {};
        return db
          .collection(`conversations/${req.params.id}/messages`)
          .doc(doc.id)
          .update({
            readBy: Array.from(new Set([...(message.readBy || []), user.uid])),
            updatedAt: new Date().toISOString(),
          });
      })
    );

    res.json({ success: true, count: snapshot.docs.length });
  } catch (error) {
    next(error);
  }
});

export default router;
