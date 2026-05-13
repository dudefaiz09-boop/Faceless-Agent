import { z } from 'zod';

export const AIUsageMetricSchema = z.object({
  schoolId: z.string(),
  userId: z.string(),
  feature: z.enum(['lesson-plan', 'grading-assistant', 'chatbot', 'intervention-suggestion']),
  timestamp: z.string(),
  tokensUsed: z.number().optional(),
  success: z.boolean(),
  responseTimeMs: z.number(),
});

export type AIUsageMetric = z.infer<typeof AIUsageMetricSchema>;

export const AISummarySchema = z.object({
  period: z.string(),
  totalInteractions: z.number(),
  activeUsers: z.number(),
  featureDistribution: z.record(z.string(), z.number()),
  avgResponseTime: z.number(),
});

export type AISummary = z.infer<typeof AISummarySchema>;
