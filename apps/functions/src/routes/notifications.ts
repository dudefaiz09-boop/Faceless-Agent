import { Router } from 'express';
import type { Request } from 'express';
import { db } from '../lib/documents.js';
import { requireAnyRole } from '../middleware/permissions.js';
import { createNotification } from '../lib/notifications.js';
import {
  createNotificationSchema,
  notificationIdParamsSchema,
} from '../schemas/notifications.js';

const router: Router = Router();

type NotificationDoc = {
  id: string;
  archivedBy?: string[];
  readBy?: string[];
  targetUserIds?: string[];
  targetRoles?: string[];
  targetClasses?: string[];
  schoolId?: string;
  tenantId?: string;
  archived?: boolean;
  actorId?: string;
  title?: string;
  message?: string;
  type?: string;
  href?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type DocumentSnapshotLike = {
  id: string;
  data: () => Record<string, unknown> | undefined;
};

function canSeeNotification(
  notification: NotificationDoc,
  user: NonNullable<Request['user']>,
  activeTenantId?: string
) {
  const archivedBy = notification.archivedBy || [];
  if (archivedBy.includes(user.uid)) return false;

  const targetUserIds = notification.targetUserIds || [];
  const targetRoles = notification.targetRoles?.length ? notification.targetRoles : ['all'];
  const targetClasses = notification.targetClasses?.length ? notification.targetClasses : ['all'];
  const schoolId = notification.schoolId || notification.tenantId;

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const userClassIds = user.classIds || (user.classId ? [user.classId] : []);

  const userMatch = targetUserIds.length === 0 || targetUserIds.includes(user.uid);
  const roleMatch =
    targetRoles.includes('all') || userRoles.some((role) => targetRoles.includes(role));
  const classMatch =
    targetClasses.includes('all') ||
    userClassIds.some((classId) => targetClasses.includes(classId));
  const schoolMatch = !schoolId || schoolId === activeTenantId || schoolId === user.schoolId;

  return !notification.archived && userMatch && roleMatch && classMatch && schoolMatch;
}

function toNotificationDoc(doc: DocumentSnapshotLike): NotificationDoc {
  return {
    id: doc.id,
    ...(doc.data() as Omit<NotificationDoc, 'id'>),
  };
}

async function getVisibleNotifications(req: Request) {
  const snapshot = await db
    .collection('notifications')
    .where('tenantId', '==', req.tenantId)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  return snapshot.docs
    .map(toNotificationDoc)
    .filter((notification) => canSeeNotification(notification, req.user!, req.tenantId));
}

router.get('/', async (req, res, next) => {
  try {
    const notifications = await getVisibleNotifications(req);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAnyRole(['admin', 'principal', 'super_admin']), async (req, res, next) => {
  try {
    const parsedBody = createNotificationSchema.parse(req.body);

    const notification = await createNotification({
      title: parsedBody.title,
      message: parsedBody.message,
      type: parsedBody.type,
      href: parsedBody.href,
      targetUserIds: parsedBody.targetUserIds,
      targetRoles: parsedBody.targetRoles,
      targetClasses: parsedBody.targetClasses,
      schoolId: req.tenantId,
      tenantId: req.tenantId,
      actorId: req.user!.uid,
      metadata: parsedBody.metadata,
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});

// IMPORTANT: /read-all must come BEFORE /:id/read
router.patch('/read-all', async (req, res, next) => {
  try {
    const visible = await getVisibleNotifications(req);
    const now = new Date().toISOString();

    await Promise.all(
      visible.map((notification) =>
        db
          .collection('notifications')
          .doc(notification.id)
          .update({
            readBy: Array.from(new Set([...(notification.readBy || []), req.user!.uid])),
            updatedAt: now,
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
    const { id } = notificationIdParamsSchema.parse(req.params);

    const ref = db.collection('notifications').doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = toNotificationDoc(snapshot);

    if (!canSeeNotification(notification, req.user!, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const readBy = Array.from(new Set([...(notification.readBy || []), req.user!.uid]));

    await ref.update({
      readBy,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, readBy });
  } catch (error) {
    next(error);
  }
});

router.delete('/read', async (req, res, next) => {
  try {
    const visible = await getVisibleNotifications(req);
    const readNotifications = visible.filter((notification) =>
      notification.readBy?.includes(req.user!.uid)
    );

    const now = new Date().toISOString();

    await Promise.all(
      readNotifications.map((notification) =>
        db
          .collection('notifications')
          .doc(notification.id)
          .update({
            archivedBy: Array.from(new Set([...(notification.archivedBy || []), req.user!.uid])),
            updatedAt: now,
          })
      )
    );

    res.json({ success: true, count: readNotifications.length });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = notificationIdParamsSchema.parse(req.params);

    const ref = db.collection('notifications').doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = toNotificationDoc(snapshot);

    if (!canSeeNotification(notification, req.user!, req.tenantId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user!.isAdmin || notification.actorId === req.user!.uid) {
      await ref.delete();
    } else {
      await ref.update({
        archivedBy: Array.from(new Set([...(notification.archivedBy || []), req.user!.uid])),
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;