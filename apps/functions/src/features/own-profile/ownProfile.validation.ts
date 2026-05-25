import { z } from 'zod';

export const updateOwnProfileSchema = z.object({
  body: z
    .object({
      displayName: z.string().min(1).optional(),
      photoURL: z.string().url().optional().or(z.literal('')),
    })
    .strict(),
});
