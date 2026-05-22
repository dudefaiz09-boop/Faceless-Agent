import { Router } from 'express';
import { db } from '../lib/documents.js';
import { requirePermission } from '../middleware/permissions.js';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';
import {
  announcementIdParamsSchema,
  createAnnouncementSchema,
} from '../schemas/announcements.js';

const router: Router = Router();

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

function canSeeAnnouncement(
  announcement: AnnouncementRecord,
  role: string,
  classIds: string[]
) {
  if (announcement.status === 'archived') return false;

  const targetRoles = announcement.targetRoles?.length
    ? announcement.targetRoles
    : ['all'];

  const targetClasses = announcement.targetClasses?.length
    ? announcement.targetClasses
    : ['all'];

  const roleMatch = targetRoles.includes('all') || targetRoles.includes(role);
  const classMatch =
    targetClasses.includes('all') ||
    classIds.some((classId) => targetClasses.includes(classId));

  return roleMatch && classMatch;
}

function isTenantAnnouncement(
  announcement: Pick<AnnouncementRecord, 'tenantId' | 'schoolId'>,
  tenantId?: string
) {
  return announcement.tenantId === tenantId || announcement.schoolId === tenantId;
}

router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('announcements')
      .where('tenantId', '==', req.tenantId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const role = req.user?.role || req.user?.roles?.[0] || 'student';
    const classIds = req.user?.classIds || (req.user?.classId ? [req.user.classId] : []);

    const announcements = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AnnouncementRecord, 'id'>),
      }))
      .filter((announcement) => canSeeAnnouncement(announcement, role, classIds));

    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('manageAnnouncements'), async (req, res, next) => {
  try {
    const parsedBody = createAnnouncementSchema.parse(req.body);
    const now = new Date().toISOString();

    const announcement = {
      title: parsedBody.title,
      content: parsedBody.content,
      targetClasses: parsedBody.targetClasses,
      targetRoles: parsedBody.targetRoles,
      visibility: parsedBody.visibility,
      category: parsedBody.category,
      priority: parsedBody.priority,
      pinned: parsedBody.pinned,
      attachments: parsedBody.attachments,
      status: parsedBody.isScheduled ? 'scheduled' : 'published',
      scheduledFor: parsedBody.scheduledFor || null,
      authorId: req.user!.uid,
      authorName: req.user!.displayName || 'Staff',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
      schoolId: req.tenantId,
      tenantId: req.tenantId,
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
        schoolId: req.tenantId,
        tenantId: req.tenantId,
        actorId: req.user!.uid,
        metadata: {
          announcementId: docRef.id,
          priority: announcement.priority,
        },
      });
    } catch (notificationError) {
      logger.warn(
        { err: notificationError, title: announcement.title },
        'Announcement notification could not be created'
      );
    }

    res.json({ id: docRef.id, ...announcement });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requirePermission('manageAnnouncements'), async (req, res, next) => {
  try {
    const { id } = announcementIdParamsSchema.parse(req.params);

    const announcementRef = db.collection('announcements').doc(id);
    const announcementSnapshot = await announcementRef.get();

    if (!announcementSnapshot.exists) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const announcement = announcementSnapshot.data() as AnnouncementRecord;

    if (!isTenantAnnouncement(announcement, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    await announcementRef.update({
      status: 'archived',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.uid,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;