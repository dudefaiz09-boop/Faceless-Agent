import { z } from 'zod';
import { BaseSaaSObjectSchema } from '@educonnect/shared-education';

export const NOTIFICATION_CHANNELS = {
  PUSH: 'push',
  IN_APP: 'in-app',
  EMAIL: 'email',
  SMS: 'sms',
} as const;

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent', // e.g. behavior alerts, emergency school closure
} as const;

export const NotificationPayloadSchema = BaseSaaSObjectSchema.extend({
  userId: z.string(), // Targeted recipient
  title: z.string(),
  body: z.string(),
  type: z.string(), // e.g., 'assignment_graded', 'attendance_alert'
  priority: z.nativeEnum(NOTIFICATION_PRIORITY).default(NOTIFICATION_PRIORITY.NORMAL),
  actionUrl: z.string().optional(), // Deep link
  isRead: z.boolean().default(false),
  metadata: z.record(z.any()).optional(), // Extensible metadata
  expiresAt: z.string().optional(),
});

export const NotificationPreferenceSchema = BaseSaaSObjectSchema.extend({
  userId: z.string(),
  channels: z.object({
    push: z.boolean().default(true),
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
  }),
  categories: z.object({
    assignments: z.boolean().default(true),
    attendance: z.boolean().default(true),
    announcements: z.boolean().default(true),
    fees: z.boolean().default(true),
    chat: z.boolean().default(true),
  }),
  quietHours: z
    .object({
      enabled: z.boolean().default(false),
      start: z.string().optional(), // '22:00'
      end: z.string().optional(), // '07:00'
      timezone: z.string().optional(),
    })
    .optional(),
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;
