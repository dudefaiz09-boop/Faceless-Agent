import { db } from '../../lib/documents.js';
import { createNotification } from '../../lib/notifications.js';
import { logger } from '@educonnect/logger';
import { AppError } from '../../middleware/error.js';

type AnnouncementRecord = {
  id: string;
  title?: string;
  content?: string;
  targetClasses?: string[];
  targetRoles?: string[];
  visibility?: string;
  category?: string;
  priority?: string;
  pinned?: boolean;
  attachments?: unknown[];
  status?: string;
  scheduledFor?: string | null;
  authorId?: string;
  authorName?: string;
  schoolId?: string | null;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  views?: string[];
};

type Actor = { uid: string; email?: string; schoolId?: string | null };

function canSeeAnnouncement(announcement: AnnouncementRecord, role: string, classIds: string[]) {
  if (announcement.status === 'archived') return false;
  const targetRoles = announcement.targetRoles?.length ? announcement.targetRoles : ['all'];
  const targetClasses = announcement.targetClasses?.length ? announcement.targetClasses : ['all'];
  const roleMatch = targetRoles.includes('all') || targetRoles.includes(role);
  const classMatch =
    targetClasses.includes('all') || classIds.some((classId) => targetClasses.includes(classId));
  return roleMatch && classMatch;
}

function isTenantAnnouncement(
  announcement: Pick<AnnouncementRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return announcement.tenantId === tenantId || announcement.schoolId === tenantId;
}

export class AnnouncementsRepository {
  static async list(tenantId: string, role: string, classIds: string[]) {
    const snapshot = await db
      .collection('announcements')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AnnouncementRecord, 'id'>),
      }))
      .filter((announcement) => canSeeAnnouncement(announcement, role, classIds));
  }

  static async create(
    data: {
      title: string;
      content: string;
      targetClasses?: string[];
      targetRoles?: string[];
      visibility?: string;
      category?: string;
      priority?: string;
      pinned?: boolean;
      attachments?: unknown[];
      isScheduled?: boolean;
      scheduledFor?: string | null;
    },
    actor: Actor,
    tenantId: string
  ) {
    const now = new Date().toISOString();

    const announcement = {
      title: data.title,
      content: data.content,
      targetClasses: data.targetClasses || [],
      targetRoles: data.targetRoles || [],
      visibility: data.visibility,
      category: data.category,
      priority: data.priority,
      pinned: data.pinned,
      attachments: data.attachments,
      status: data.isScheduled ? 'scheduled' : 'published',
      scheduledFor: data.scheduledFor || null,
      authorId: actor.uid,
      authorName: actor.email || 'Staff',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
      schoolId: tenantId,
      tenantId,
      views: [],
    };

    const docRef = await db.collection('announcements').add(announcement);

    try {
      await createNotification({
        title: `New announcement: ${announcement.title}`,
        message: announcement.content.slice(0, 180),
        type: 'announcement',
        href: '/announcements',
        targetRoles: announcement.targetRoles,
        targetClasses: announcement.targetClasses,
        schoolId: tenantId,
        tenantId,
        actorId: actor.uid,
        metadata: { announcementId: docRef.id, priority: announcement.priority },
      });
    } catch (notificationError) {
      logger.warn(
        { err: notificationError, title: announcement.title },
        'Announcement notification could not be created'
      );
    }

    return { id: docRef.id, ...announcement };
  }

  static async archive(id: string, tenantId: string, actorUid: string) {
    const announcementRef = db.collection('announcements').doc(id);
    const announcementSnapshot = await announcementRef.get();

    if (!announcementSnapshot.exists) {
      throw new AppError('Announcement not found', 404);
    }

    const announcement = announcementSnapshot.data() as AnnouncementRecord;

    if (!isTenantAnnouncement(announcement, tenantId)) {
      throw new AppError('Tenant access denied', 403);
    }

    await announcementRef.update({
      status: 'archived',
      updatedAt: new Date().toISOString(),
      updatedBy: actorUid,
    });
  }
}
