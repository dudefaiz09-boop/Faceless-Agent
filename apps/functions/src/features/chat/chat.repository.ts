import { db } from '../../lib/documents.js';
import { createNotification } from '../../lib/notifications.js';
import { logger } from '@educonnect/logger';
import { AppError } from '../../middleware/error.js';

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
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  roles?: string[];
  status?: 'active' | 'inactive';
  classId?: string;
  classIds?: string[];
  linkedStudentIds?: string[];
  tenantId?: string;
  schoolId?: string | null;
};
type Actor = { uid: string; email?: string; schoolId?: string | null };

function directConversationId(left: string, right: string) {
  return `direct_${[left, right].sort().join('_')}`;
}
function displayName(user: any) {
  return user.displayName || user.email || 'EduConnect user';
}
function isTenantRecord(
  record: Pick<ConversationRecord | UserRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return record.tenantId === tenantId || record.schoolId === tenantId;
}
function getClassIds(user: any) {
  return user.classIds || (user.classId ? [user.classId] : []);
}

async function canMessageUser(
  currentUser: any,
  targetUserId: string,
  tenantId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const currentRole = currentUser.role;
  if (currentRole === 'admin' || currentRole === 'principal' || currentUser.isAdmin)
    return { allowed: true, reason: 'Admin/Principal access' };
  const targetDoc = await db.collection('users').doc(targetUserId).get();
  if (!targetDoc.exists) return { allowed: false, reason: 'Target user not found' };
  const targetData = (targetDoc.data() || {}) as UserRecord;
  if (!isTenantRecord(targetData, tenantId))
    return { allowed: false, reason: 'Target user is not in this school' };
  const targetRole = targetData.role || targetData.roles?.[0] || '';
  const targetClassIds = getClassIds(targetData);
  const currentClassIds = getClassIds(currentUser);
  if (currentRole === 'student') {
    if (targetRole === 'teacher' && targetClassIds.some((c) => currentClassIds.includes(c)))
      return { allowed: true, reason: 'Class Teacher' };
    if (targetRole === 'principal' || targetRole === 'admin')
      return { allowed: true, reason: 'Administration' };
    return { allowed: false, reason: 'Not authorized to message this user' };
  }
  if (currentRole === 'parent') {
    if (targetRole === 'teacher' && targetClassIds.some((c) => currentClassIds.includes(c)))
      return { allowed: true, reason: "Child's Teacher" };
    if (targetRole === 'principal' || targetRole === 'admin')
      return { allowed: true, reason: 'Administration' };
    return { allowed: false, reason: 'Not authorized to message this user' };
  }
  if (currentRole === 'teacher') {
    if (targetRole === 'student' && targetClassIds.some((c) => currentClassIds.includes(c)))
      return { allowed: true, reason: 'Your Student' };
    if (targetRole === 'parent') {
      const hasLinked =
        (targetData.linkedStudentIds || []).length > 0 && currentClassIds.length > 0;
      if (hasLinked) return { allowed: true, reason: "Student's Parent" };
    }
    if (['principal', 'admin', 'teacher'].includes(targetRole))
      return { allowed: true, reason: 'Colleague' };
    return { allowed: false, reason: 'Not authorized to message this user' };
  }
  if (currentRole === 'librarian') {
    if (['admin', 'principal'].includes(targetRole))
      return { allowed: true, reason: 'Administration' };
    if (['student', 'parent'].includes(targetRole))
      return { allowed: true, reason: 'Library Services' };
    return { allowed: false, reason: 'Not authorized to message this user' };
  }
  if (currentRole === 'accountant') {
    if (['admin', 'principal'].includes(targetRole))
      return { allowed: true, reason: 'Administration' };
    if (['student', 'parent'].includes(targetRole))
      return { allowed: true, reason: 'Fee Management' };
    return { allowed: false, reason: 'Not authorized to message this user' };
  }
  return { allowed: false, reason: 'Not authorized to message this user' };
}

function assertConversationAccess(conversation: ConversationRecord, user: any, tenantId?: string) {
  if (!isTenantRecord(conversation, tenantId))
    return { allowed: false, error: 'Tenant access denied' };
  if (!conversation.participants?.includes(user.uid))
    return { allowed: false, error: 'You are not a participant in this conversation' };
  return { allowed: true };
}

export class ChatRepository {
  static async listRooms(user: any, tenantId: string) {
    const snapshot = await db.collection('conversations').where('tenantId', '==', tenantId).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as ConversationRecord) }))
      .filter((room) => room.participants?.includes(user.uid))
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.lastMessageAt || 0).getTime() -
          new Date(a.updatedAt || a.lastMessageAt || 0).getTime()
      );
  }

  static async listContacts(user: any, tenantId: string) {
    const snapshot = await db.collection('users').where('tenantId', '==', tenantId).get();
    const contacts = await Promise.all(
      snapshot.docs.map(async (doc) => {
        if (doc.id === user.uid) return null;
        const profile = (doc.data() || {}) as UserRecord;
        if (profile.status === 'inactive') return null;
        const eligibility = await canMessageUser(user, doc.id, tenantId);
        if (!eligibility.allowed) return null;
        return {
          id: doc.id,
          uid: profile.uid || doc.id,
          email: profile.email,
          displayName: profile.displayName,
          role: profile.role,
          roles: profile.roles,
          status: profile.status,
          classId: profile.classId,
          classIds: profile.classIds,
          linkedStudentIds: profile.linkedStudentIds,
        };
      })
    );
    return contacts
      .filter(Boolean)
      .sort((a, b) =>
        String(a?.displayName || a?.email || '').localeCompare(
          String(b?.displayName || b?.email || '')
        )
      );
  }

  static async getMessages(conversationId: string, user: any, tenantId: string) {
    const roomSnapshot = await db.collection('conversations').doc(conversationId).get();
    if (!roomSnapshot.exists) throw new AppError('Conversation not found', 404);
    const conversation = (roomSnapshot.data() || {}) as ConversationRecord;
    const access = assertConversationAccess(conversation, user, tenantId);
    if (!access.allowed) throw new AppError(access.error!, 403);
    const snapshot = await db
      .collection(`conversations/${conversationId}/messages`)
      .orderBy('sentAt', 'asc')
      .limit(200)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      conversationId,
      ...(doc.data() as MessageRecord),
    }));
  }

  static async createConversation(data: any, user: any, tenantId: string) {
    const now = new Date().toISOString();
    if (data.type === 'direct') {
      const recipientId = data.recipientId!;
      if (recipientId === user.uid) throw new AppError('A valid recipientId is required', 400);
      const eligibility = await canMessageUser(user, recipientId, tenantId);
      if (!eligibility.allowed) throw new AppError(eligibility.reason || 'Not authorized', 403);
      const id = directConversationId(user.uid, recipientId);
      const ref = db.collection('conversations').doc(id);
      const snapshot = await ref.get();
      const baseConversation: ConversationRecord = {
        participants: [user.uid, recipientId],
        type: 'direct',
        name: null,
        schoolId: tenantId,
        tenantId,
        updatedAt: now,
      };
      if (snapshot.exists) {
        const existing = (snapshot.data() || {}) as ConversationRecord;
        if (!isTenantRecord(existing, tenantId)) throw new AppError('Tenant access denied', 403);
        await ref.update({ updatedAt: now });
        return { id, ...existing, updatedAt: now };
      }
      await ref.set({ ...baseConversation, lastMessage: '', createdAt: now, createdBy: user.uid });
      return { id, ...baseConversation, lastMessage: '', createdAt: now, createdBy: user.uid };
    }
    const participants = Array.from(
      new Set([user.uid, ...data.participantIds.map(String).filter(Boolean)])
    );
    if (participants.length < 2)
      throw new AppError('Group chats require at least two participants', 400);
    const ref = await db.collection('conversations').add({
      participants,
      type: 'group',
      name: data.name,
      lastMessage: '',
      schoolId: tenantId,
      tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    });
    return {
      id: ref.id,
      participants,
      type: 'group',
      name: data.name,
      lastMessage: '',
      schoolId: tenantId,
      tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    };
  }

  static async sendMessage(
    data: { conversationId?: string; recipientId?: string; text: string },
    user: any,
    tenantId: string
  ) {
    const now = new Date().toISOString();
    let conversationId = data.conversationId || '';
    let conversation: ConversationRecord;

    if (conversationId) {
      const snapshot = await db.collection('conversations').doc(conversationId).get();
      if (!snapshot.exists) throw new AppError('Conversation not found', 404);
      conversation = (snapshot.data() || {}) as ConversationRecord;
      const access = assertConversationAccess(conversation, user, tenantId);
      if (!access.allowed) throw new AppError(access.error!, 403);
    } else {
      const targetRecipientId = data.recipientId!;
      if (targetRecipientId === user.uid)
        throw new AppError('recipientId is required for a new direct message', 400);
      const eligibility = await canMessageUser(user, targetRecipientId, tenantId);
      if (!eligibility.allowed) throw new AppError(eligibility.reason || 'Not authorized', 403);
      conversationId = directConversationId(user.uid, targetRecipientId);
      const ref = db.collection('conversations').doc(conversationId);
      const snapshot = await ref.get();
      conversation = snapshot.exists
        ? ((snapshot.data() || {}) as ConversationRecord)
        : {
            participants: [user.uid, targetRecipientId],
            type: 'direct',
            name: null,
            schoolId: tenantId,
            tenantId,
            createdAt: now,
            createdBy: user.uid,
          };
      if (snapshot.exists && !isTenantRecord(conversation, tenantId))
        throw new AppError('Tenant access denied', 403);
      if (!snapshot.exists) await ref.set({ ...conversation, lastMessage: '', updatedAt: now });
    }

    const participants = Array.isArray(conversation.participants)
      ? conversation.participants
      : [user.uid];
    const messageRef = await db.collection(`conversations/${conversationId}/messages`).add({
      senderId: user.uid,
      senderName: displayName(user),
      text: data.text,
      sentAt: now,
      readBy: [user.uid],
      status: 'sent',
      schoolId: tenantId,
      tenantId,
    });
    await db.collection('conversations').doc(conversationId).update({
      lastMessage: data.text,
      lastMessageAt: now,
      lastSenderId: user.uid,
      updatedAt: now,
    });
    const recipients = participants.filter((p) => p !== user.uid);
    if (recipients.length > 0) {
      try {
        await createNotification({
          title: `New message from ${displayName(user)}`,
          message: data.text.slice(0, 180),
          type: 'chat',
          href: '/chat',
          targetUserIds: recipients,
          schoolId: tenantId,
          tenantId,
          actorId: user.uid,
          metadata: { conversationId, messageId: messageRef.id },
        });
      } catch (error) {
        logger.warn({ err: error }, 'Chat notification could not be created');
      }
    }
    return {
      id: messageRef.id,
      conversationId,
      senderId: user.uid,
      senderName: displayName(user),
      text: data.text,
      sentAt: now,
      readBy: [user.uid],
      status: 'sent',
    };
  }

  static async markRead(conversationId: string, user: any, tenantId: string) {
    const roomSnapshot = await db.collection('conversations').doc(conversationId).get();
    if (!roomSnapshot.exists) throw new AppError('Conversation not found', 404);
    const conversation = (roomSnapshot.data() || {}) as ConversationRecord;
    const access = assertConversationAccess(conversation, user, tenantId);
    if (!access.allowed) throw new AppError(access.error!, 403);
    const snapshot = await db
      .collection(`conversations/${conversationId}/messages`)
      .orderBy('sentAt', 'desc')
      .limit(100)
      .get();
    const unreadDocs = snapshot.docs.filter((doc) => {
      const m = (doc.data() || {}) as MessageRecord;
      return !m.readBy?.includes(user.uid);
    });
    const now = new Date().toISOString();
    await Promise.all(
      unreadDocs.map((doc) => {
        const current = ((doc.data() || {}) as MessageRecord).readBy || [];
        return doc.ref.update({ readBy: [...current, user.uid], updatedAt: now });
      })
    );
    return { success: true, count: unreadDocs.length };
  }
}
