import { z } from 'zod';
import { BaseSaaSObjectSchema } from '../core/schemas.js';

export const ParentStudentLinkSchema = BaseSaaSObjectSchema.extend({
  parentId: z.string(),
  studentId: z.string(),
  relationship: z.string().optional(),
  isVerified: z.boolean().default(false),
});

export type ParentStudentLink = z.infer<typeof ParentStudentLinkSchema>;
