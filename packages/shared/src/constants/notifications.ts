/**
 * SHARED NOTIFICATION CONSTANTS
 */

export const NOTIFICATION_CHANNELS = {
  ASSIGNMENTS: 'assignments',
  ATTENDANCE: 'attendance',
  ANNOUNCEMENTS: 'announcements',
  FEES: 'fees',
  CHAT: 'chat',
} as const;

export const NOTIFICATION_PRIORITY = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
} as const;
