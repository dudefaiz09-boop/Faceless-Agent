import { z } from 'zod';

export const chatbotQuerySchema = z.object({
  body: z
    .object({
      query: z.string().min(1).max(2000),
    })
    .strict(),
});

export const aiSuggestionSchema = z.object({
  body: z
    .object({
      studentId: z.string(),
      records: z.array(z.any()),
    })
    .strict(),
});
