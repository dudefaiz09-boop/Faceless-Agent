import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);

export const chatRoomParamsSchema = z
  .object({
    id: nonEmptyString,
  })
  .strict();

export const createConversationSchema = z
  .object({
    type: z.enum(['direct', 'group']).optional().default('direct'),
    recipientId: z.string().trim().optional(),
    name: z.string().trim().optional(),
    participantIds: z.array(z.string().trim().min(1)).optional().default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === 'direct' && !value.recipientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'recipientId is required for direct conversations.',
        path: ['recipientId'],
      });
    }

    if (value.type === 'group') {
      if (!value.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'name is required for group conversations.',
          path: ['name'],
        });
      }

      if (!value.participantIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'participantIds are required for group conversations.',
          path: ['participantIds'],
        });
      }
    }
  });

export const sendMessageSchema = z
  .object({
    conversationId: z.string().trim().optional(),
    recipientId: z.string().trim().optional(),
    text: nonEmptyString.max(2000, 'Message is too long.'),
  })
  .strict()
  .refine((value) => Boolean(value.conversationId || value.recipientId), {
    message: 'conversationId or recipientId is required.',
    path: ['conversationId'],
  });