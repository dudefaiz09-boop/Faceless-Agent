import { z } from 'zod';

export const chatRoomParamsSchema = z.object({
  params: z.object({ id: z.string() }),
});

export const createConversationSchema = z.object({
  body: z
    .object({
      type: z.enum(['direct', 'group']),
      recipientId: z.string().optional(),
      participantIds: z.array(z.string()).optional().default([]),
      name: z.string().optional(),
    })
    .strict(),
});

export const sendMessageSchema = z.object({
  body: z
    .object({
      conversationId: z.string().optional(),
      recipientId: z.string().optional(),
      text: z.string().min(1),
    })
    .strict(),
});
