import { db } from '../../lib/documents.js';
import { createNotification } from '../../lib/notifications.js';
import { AppError } from '../../middleware/error.js';
import type { Request } from 'express';

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

function canSeeNotification(notification: NotificationDoc, user: any, activeTenantId?: string) {
  if ((notification.archivedBy || []).includes(user.uid)) return false;
  const targetUserIds = notification.targetUserIds || [];
  const targetRoles = notification.targetRoles?.length ? notification.targetRoles : ['all'];
  const targetClasses = notification.targetClasses?.length ? notification.targetClasses : ['all'];
  const schoolId = notification.schoolId || notification.tenantId;
  const userRoles = user.roles || (user.role ? [user.role] : []);
  const userClassIds = user.classIds || (user.classId ? [user.classId] : []);
  const userMatch = targetUserIds.length === 0 || targetUserIds.includes(user.uid);
  const roleMatch =
    targetRoles.includes('all') || userRoles.some((r: string) => targetRoles.includes(r));
  const classMatch =
    targetClasses.includes('all') || userClassIds.some((c: string) => targetClasses.includes(c));
  const schoolMatch = !schoolId || schoolId === activeTenantId || schoolId === user.schoolId;
  return !notification.archived && userMatch && roleMatch && classMatch && schoolMatch;
}

function toNotificationDoc(doc: any): NotificationDoc {
  return { id: doc.id, ...(doc.data() as Omit<NotificationDoc, 'id'>) };
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
    .filter((n) => canSeeNotification(n, req.user!, req.tenantId));
}

export class NotificationsRepository {
  static async list(req: Request) {
    return getVisibleNotifications(req);
  }

  static async create(data: any, actor: any, tenantId: string) {
    return createNotification({
      title: data.title,
      message: data.message,
      type: data.type,
      href: data.href,
      targetUserIds: data.targetUserIds,
      targetRoles: data.targetRoles,
      targetClasses: data.targetClasses,
      schoolId: tenantId,
      tenantId,
      actorId: actor.uid,
      metadata: data.metadata,
    });
  }

  static async markAllRead(req: Request) {
    const visible = await getVisibleNotifications(req);
    const now = new Date().toISOString();
    await Promise.all(
      visible.map((n) =>
        db
          .collection('notifications')
          .doc(n.id)
          .update({
            readBy: Array.from(new Set([...(n.readBy || []), req.user!.uid])),
            updatedAt: now,
          })
      )
    );
    return { success: true, count: visible.length };
  }

  static async markRead(id: string, req: Request) {
    const ref = db.collection('notifications').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new AppError('Notification not found', 404);
    const notification = toNotificationDoc(snapshot);
    if (!canSeeNotification(notification, req.user!, req.tenantId))
      throw new AppError('Forbidden', 403);
    const readBy = Array.from(new Set([...(notification.readBy || []), req.user!.uid]));
    await ref.update({ readBy, updatedAt: new Date().toISOString() });
    return { success: true, readBy };
  }

  static async archiveRead(req: Request) {
    const visible = await getVisibleNotifications(req);
    const readNotifications = visible.filter((n) => n.readBy?.includes(req.user!.uid));
    const now = new Date().toISOString();
    await Promise.all(
      readNotifications.map((n) =>
        db
          .collection('notifications')
          .doc(n.id)
          .update({
            archivedBy: Array.from(new Set([...(n.archivedBy || []), req.user!.uid])),
            updatedAt: now,
          })
      )
    );
    return { success: true, count: readNotifications.length };
  }

  static async archive(id: string, req: Request) {
    const ref = db.collection('notifications').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new AppError('Notification not found', 404);
    const notification = toNotificationDoc(snapshot);
    if (!canSeeNotification(notification, req.user!, req.tenantId))
      throw new AppError('Forbidden', 403);
    if (req.user!.isAdmin || notification.actorId === req.user!.uid) {
      await ref.delete();
    } else {
      await ref.update({
        archivedBy: Array.from(new Set([...(notification.archivedBy || []), req.user!.uid])),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
