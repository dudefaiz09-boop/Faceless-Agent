import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const stringArraySchema = z.array(z.string().trim().min(1));

export const notificationIdParamsSchema = z
  .object({
    id: nonEmptyString,
  })
  .strict();

export const createNotificationSchema = z
  .object({
    title: nonEmptyString,
    message: nonEmptyString,
    type: z.string().trim().min(1).optional().default('system'),
    href: z.string().trim().optional(),
    targetUserIds: stringArraySchema.optional().default([]),
    targetRoles: stringArraySchema.optional().default(['all']),
    targetClasses: stringArraySchema.optional().default(['all']),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .strict();