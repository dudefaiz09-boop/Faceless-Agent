import { z } from 'zod';
import { TimestampValueSchema } from '@educonnect/shared';

/**
 * BASE SaaS SCHEMAS
 * Every document in the multi-tenant architecture MUST have a schoolId.
 */

export const BaseSaaSObjectSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  createdAt: TimestampValueSchema.optional(),
  updatedAt: TimestampValueSchema.optional(),
  isArchived: z.boolean().default(false),
});

export type BaseSaaSObject = z.infer<typeof BaseSaaSObjectSchema>;
