import { Router } from 'express';
import { db } from '../lib/documents.js';
import { checkPermission } from '../middleware/auth.js';
import { AnnouncementSchema } from '@educonnect/shared';
import { createNotification } from '../lib/notifications.js';
import { logger } from '@educonnect/logger';

const router: Router = Router();

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
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((announcement: any) => {
        if (announcement.status === 'archived') return false;
        const targetRoles = announcement.targetRoles || ['all'];
        const targetClasses = announcement.targetClasses || ['all'];
        const roleMatch = targetRoles.includes('all') || targetRoles.includes(role);
        const classMatch =
          targetClasses.includes('all') ||
          classIds.some((classId) => targetClasses.includes(classId));
        return roleMatch && classMatch;
      });
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

// Create announcement (Admin/Teacher only)
router.post('/', checkPermission('manageAnnouncements'), async (req, res, next) => {
  try {
    // Validate request body using shared schema
    const validation = AnnouncementSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Failed',
        message:
          validation.error.issues[0]?.message ||
          'Please check the announcement title, content, and audience.',
        details: validation.error.format(),
      });
    }

    const { title, content, targetClasses, visibility } = validation.data;

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const announcement = {
      title,
      content,
      targetClasses,
      targetRoles: req.body.targetRoles || ['all'],
      visibility,
      category: req.body.category || 'general',
      priority: req.body.priority || 'normal',
      pinned: !!req.body.pinned,
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
      status: req.body.isScheduled ? 'scheduled' : 'published',
      scheduledFor: req.body.scheduledFor || null,
      authorId: req.user.uid,
      authorName: req.user.displayName || 'Staff',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      views: [],
    };

    const docRef = await db.collection('announcements').add(announcement);
    try {
      await createNotification({
        title: `New announcement: ${title}`,
        message: content.slice(0, 180),
        type: 'announcement',
        href: '/announcements',
        targetRoles: announcement.targetRoles,
        targetClasses: announcement.targetClasses,
        schoolId: req.tenantId,
        tenantId: req.tenantId,
        actorId: req.user.uid,
        metadata: { announcementId: docRef.id, priority: announcement.priority },
      });
    } catch (notificationError) {
      // Announcement creation is the source of truth; a notification failure must not roll it back.
      logger.warn(
        { err: notificationError, title },
        'Announcement notification could not be created'
      );
    }
    res.json({ id: docRef.id, ...announcement });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', checkPermission('manageAnnouncements'), async (req, res, next) => {
  try {
    await db.collection('announcements').doc(req.params.id).update({
      status: 'archived',
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
