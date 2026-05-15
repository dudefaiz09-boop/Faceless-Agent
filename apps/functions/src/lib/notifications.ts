import { db } from './documents.js';

export interface NotificationAudience {
  targetUserIds?: string[];
  targetRoles?: string[];
  targetClasses?: string[];
  schoolId?: string | null;
  tenantId?: string | null;
}

export interface NotificationInput extends NotificationAudience {
  title: string;
  message: string;
  type?: 'announcement' | 'assignment' | 'attendance' | 'fee' | 'chat' | 'system';
  href?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: NotificationInput) {
  const now = new Date().toISOString();
  const notification = {
    title: input.title,
    message: input.message,
    type: input.type || 'system',
    href: input.href || null,
    targetUserIds: input.targetUserIds || [],
    targetRoles: input.targetRoles?.length ? input.targetRoles : ['all'],
    targetClasses: input.targetClasses?.length ? input.targetClasses : ['all'],
    schoolId: input.schoolId || input.tenantId || 'default-school',
    tenantId: input.tenantId || input.schoolId || 'default-school',
    actorId: input.actorId || null,
    readBy: [],
    archived: false,
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection('notifications').add(notification);
  return { id: ref.id, ...notification };
}
