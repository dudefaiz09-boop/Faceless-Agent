import { z } from 'zod';
import { AnnouncementSchema } from '@educonnect/shared';

const nonEmptyString = z.string().trim().min(1);
const stringArraySchema = z.array(z.string().trim().min(1));

export const announcementIdParamsSchema = z
  .object({
    id: nonEmptyString,
  })
  .strict();

export const createAnnouncementSchema = AnnouncementSchema.extend({
  targetRoles: stringArraySchema.optional().default(['all']),
  category: z.string().trim().min(1).optional().default('general'),
  priority: z.string().trim().min(1).optional().default('normal'),
  pinned: z.coerce.boolean().optional().default(false),
  attachments: z.array(z.unknown()).optional().default([]),
  isScheduled: z.coerce.boolean().optional().default(false),
  scheduledFor: z.string().trim().nullable().optional(),
}).strict();