import { z } from 'zod';
import { ROLES } from '../constants/index.js';

export const AnnouncementSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10).max(5000),
  targetClasses: z.array(z.string()).default(['all']),
  visibility: z.enum(['school', 'class', 'public', 'private']).default('school'),
});

export type AnnouncementInput = z.infer<typeof AnnouncementSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const AttendanceSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'absent', 'late']),
});
