import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  body: z
    .object({
      title: z.string().min(1),
      content: z.string().min(1),
      targetClasses: z.array(z.string()).optional().default([]),
      targetRoles: z.array(z.string()).optional().default([]),
      visibility: z.string().optional(),
      category: z.string().optional(),
      priority: z.string().optional(),
      pinned: z.boolean().optional(),
      attachments: z.array(z.unknown()).optional(),
      isScheduled: z.boolean().optional(),
      scheduledFor: z.string().nullable().optional(),
    })
    .strict(),
});

export const announcementIdParamsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});
