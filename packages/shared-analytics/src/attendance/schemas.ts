import { z } from 'zod';

export const AttendanceStatsSchema = z.object({
  schoolId: z.string(),
  classId: z.string().optional(),
  date: z.string(),
  presentCount: z.number(),
  absentCount: z.number(),
  lateCount: z.number(),
  totalStudents: z.number(),
  attendanceRate: z.number(),
});

export type AttendanceStats = z.infer<typeof AttendanceStatsSchema>;

export const AttendanceTrendSchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  data: z.array(AttendanceStatsSchema),
});

export type AttendanceTrend = z.infer<typeof AttendanceTrendSchema>;
