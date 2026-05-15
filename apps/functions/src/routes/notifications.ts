import { Router } from 'express';
import type { Request } from 'express';
import { db } from '../lib/documents.js';
import { checkAdmin } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';

const router: Router = Router();

function canSeeNotification(notification: any, user: NonNullable<Request['user']>) {
  const targetUserIds = notification.targetUserIds || [];
  const targetRoles = notification.targetRoles || ['all'];
  const targetClasses = notification.targetClasses || ['all'];
  const schoolId = notification.schoolId || notification.tenantId;

  const userMatch = targetUserIds.length === 0 || targetUserIds.includes(user.uid);
  const roleMatch =
    targetRoles.includes('all') || user.roles.some((role) => targetRoles.includes(role));
  const classMatch =
    targetClasses.includes('all') || user.classIds.some((classId) => targetClasses.includes(classId));
  const schoolMatch = !schoolId || !user.schoolId || schoolId === user.schoolId;

  return !notification.archived && userMatch && roleMatch && classMatch && schoolMatch;
}

router.get('/', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const snapshot = await db.collection('notifications').orderBy('createdAt', 'desc').limit(50).get();
    const notifications = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((notification) => canSeeNotification(notification, req.user!));

    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.post('/', checkAdmin, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    const notification = await createNotification({
      title,
      message,
      type: req.body.type || 'system',
      href: req.body.href,
      targetUserIds: Array.isArray(req.body.targetUserIds) ? req.body.targetUserIds : [],
      targetRoles: Array.isArray(req.body.targetRoles) ? req.body.targetRoles : ['all'],
      targetClasses: Array.isArray(req.body.targetClasses) ? req.body.targetClasses : ['all'],
      schoolId: req.user.schoolId,
      tenantId: req.tenantId,
      actorId: req.user.uid,
      metadata: req.body.metadata || {},
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});

// IMPORTANT: /read-all must come BEFORE /:id/read to prevent Express from treating "read-all" as an ID parameter
router.patch('/read-all', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const snapshot = await db.collection('notifications').orderBy('createdAt', 'desc').limit(50).get();
    const visible = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((notification) => canSeeNotification(notification, req.user!));

    await Promise.all(
      visible.map((notification: any) =>
        db
          .collection('notifications')
          .doc(notification.id)
          .update({
            readBy: Array.from(new Set([...(notification.readBy || []), req.user!.uid])),
            updatedAt: new Date().toISOString(),
          })
      )
    );

    res.json({ success: true, count: visible.length });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const ref = db.collection('notifications').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Notification not found' });

    const notification = { id: snapshot.id, ...snapshot.data() };
    if (!canSeeNotification(notification, req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const readBy = Array.from(new Set([...(notification.readBy || []), req.user.uid]));
    await ref.update({ readBy, updatedAt: new Date().toISOString() });
    res.json({ success: true, readBy });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const ref = db.collection('notifications').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Notification not found' });

    const notification = { id: snapshot.id, ...snapshot.data() };
    if (!canSeeNotification(notification, req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ref.delete();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
