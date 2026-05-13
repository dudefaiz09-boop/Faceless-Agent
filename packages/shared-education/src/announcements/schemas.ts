import { z } from 'zod';
import { BaseSaaSObjectSchema } from '../core/schemas.js';

export const AnnouncementSchema = BaseSaaSObjectSchema.extend({
  title: z.string().min(1),
  content: z.string(),
  authorId: z.string(),
  authorName: z.string().optional(),
  targetClasses: z.array(z.string()), // ['all'] or specific IDs
  targetRoles: z.array(z.string()).default(['all']),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  isScheduled: z.boolean().default(false),
  scheduledFor: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  views: z.array(z.string()).default([]), // Array of User IDs
});

export type Announcement = z.infer<typeof AnnouncementSchema>;
