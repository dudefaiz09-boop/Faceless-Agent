import { z } from 'zod';
import { BaseSaaSObjectSchema } from '@educonnect/shared-education';

export const InterventionAlertSchema = BaseSaaSObjectSchema.extend({
  studentId: z.string(),
  teacherId: z.string().optional(),
  type: z.enum(['attendance', 'assignment', 'grade', 'behavior']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string(),
  suggestedAction: z.string().optional(),
  isApproved: z.boolean().default(false),
  approvedBy: z.string().optional(),
  status: z.enum(['pending', 'active', 'resolved', 'ignored']).default('pending'),
});

export type InterventionAlert = z.infer<typeof InterventionAlertSchema>;
