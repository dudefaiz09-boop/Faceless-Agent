import { z } from 'zod';

export const EngagementMetricSchema = z.object({
  schoolId: z.string(),
  date: z.string(), // YYYY-MM-DD
  activeUsers: z.number(),
  avgTimeSpent: z.number(),
  assignmentCompletionRate: z.number(),
  attendanceRate: z.number(),
});

export const AnalyticsQuerySchema = z.object({
  schoolId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  metrics: z.array(z.string()),
  groupBy: z.enum(['day', 'week', 'month', 'class']).optional(),
});

export type EngagementMetric = z.infer<typeof EngagementMetricSchema>;
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
