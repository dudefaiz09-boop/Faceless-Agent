import { z } from 'zod';
/**
 * SaaS SUBSCRIPTION TIERS
 */
export declare const SUBSCRIPTION_TIERS: {
  readonly FREE: 'free';
  readonly BASIC: 'school_basic';
  readonly PRO: 'school_pro';
  readonly ENTERPRISE: 'enterprise';
};
export declare const SubscriptionSchema: z.ZodObject<
  {
    tier: z.ZodNativeEnum<{
      readonly FREE: 'free';
      readonly BASIC: 'school_basic';
      readonly PRO: 'school_pro';
      readonly ENTERPRISE: 'enterprise';
    }>;
    status: z.ZodEnum<['active', 'past_due', 'canceled']>;
    currentPeriodEnd: z.ZodString;
    features: z.ZodRecord<z.ZodString, z.ZodBoolean>;
    usageLimits: z.ZodObject<
      {
        students: z.ZodNumber;
        assignmentsPerMonth: z.ZodNumber;
        aiRequestsPerMonth: z.ZodNumber;
      },
      'strip',
      z.ZodTypeAny,
      {
        students: number;
        assignmentsPerMonth: number;
        aiRequestsPerMonth: number;
      },
      {
        students: number;
        assignmentsPerMonth: number;
        aiRequestsPerMonth: number;
      }
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'active' | 'past_due' | 'canceled';
    tier: 'free' | 'school_basic' | 'school_pro' | 'enterprise';
    currentPeriodEnd: string;
    features: Record<string, boolean>;
    usageLimits: {
      students: number;
      assignmentsPerMonth: number;
      aiRequestsPerMonth: number;
    };
  },
  {
    status: 'active' | 'past_due' | 'canceled';
    tier: 'free' | 'school_basic' | 'school_pro' | 'enterprise';
    currentPeriodEnd: string;
    features: Record<string, boolean>;
    usageLimits: {
      students: number;
      assignmentsPerMonth: number;
      aiRequestsPerMonth: number;
    };
  }
>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
