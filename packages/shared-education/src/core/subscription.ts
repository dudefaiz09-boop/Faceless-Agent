import { z } from 'zod';

/**
 * SaaS SUBSCRIPTION TIERS
 */
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'school_basic',
  PRO: 'school_pro',
  ENTERPRISE: 'enterprise',
} as const;

export const SubscriptionSchema = z.object({
  tier: z.nativeEnum(SUBSCRIPTION_TIERS),
  status: z.enum(['active', 'past_due', 'canceled']),
  currentPeriodEnd: z.string(),
  features: z.record(z.boolean()), // Feature flags
  usageLimits: z.object({
    students: z.number(),
    assignmentsPerMonth: z.number(),
    aiRequestsPerMonth: z.number(),
  })
});

export type Subscription = z.infer<typeof SubscriptionSchema>;
