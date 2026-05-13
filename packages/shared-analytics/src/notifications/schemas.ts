import { z } from 'zod';

export const NotificationMetricSchema = z.object({
  channel: z.enum(['email', 'push', 'sms', 'in-app']),
  sentCount: z.number(),
  deliveredCount: z.number(),
  openedCount: z.number(),
  clickedCount: z.number(),
  avgOpenTimeMs: z.number().optional(),
});

export type NotificationMetric = z.infer<typeof NotificationMetricSchema>;

export const NotificationEffectivenessSchema = z.object({
  schoolId: z.string(),
  period: z.string(),
  overallEngagement: z.number(),
  channelPerformance: z.array(NotificationMetricSchema),
});

export type NotificationEffectiveness = z.infer<typeof NotificationEffectivenessSchema>;
