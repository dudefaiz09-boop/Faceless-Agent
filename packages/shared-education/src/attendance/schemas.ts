import { z } from 'zod';
import { BaseSaaSObjectSchema } from '../core/schemas.js';

export const AttendanceRecordSchema = BaseSaaSObjectSchema.extend({
  studentId: z.string(),
  classId: z.string(),
  date: z.string(), // YYYY-MM-DD
  status: z.enum(['present', 'absent', 'late']),
  markedBy: z.string().optional(),
});

export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;
