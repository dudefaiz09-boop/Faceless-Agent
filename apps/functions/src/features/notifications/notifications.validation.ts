import { z } from 'zod';

export const createNotificationSchema = z.object({
  body: z
    .object({
      title: z.string().min(1),
      message: z.string().min(1),
      type: z.string(),
      href: z.string().optional(),
      targetUserIds: z.array(z.string()).optional(),
      targetRoles: z.array(z.string()).optional(),
      targetClasses: z.array(z.string()).optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .strict(),
});

export const notificationIdParamsSchema = z.object({
  params: z.object({ id: z.string() }),
});
