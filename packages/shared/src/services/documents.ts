import { COLLECTIONS } from '../constants/index.js';

/**
 * SHARED DOCUMENT QUERY SERVICE
 * Centralized query definitions to ensure Web and Mobile use identical data access patterns.
 */

export const DocumentQueries = {
  getLatestAnnouncements: (limitCount: number = 10) => ({
    collection: COLLECTIONS.ANNOUNCEMENTS,
    orderByField: 'createdAt',
    orderDirection: 'desc' as const,
    limit: limitCount,
  }),

  getAnnouncementsForStudent: (classId: string | null, limitCount: number = 10) => ({
    collection: COLLECTIONS.ANNOUNCEMENTS,
    whereConditions: [
      {
        field: 'targetClasses',
        operator: 'array-contains-any' as const,
        value: ['all', ...(classId ? [classId] : [])],
      },
    ],
    orderByField: 'createdAt',
    orderDirection: 'desc' as const,
    limit: limitCount,
  }),

  getAttendanceForDate: (classId: string, date: string) => ({
    collection: COLLECTIONS.ATTENDANCE,
    whereConditions: [
      { field: 'classId', operator: '==' as const, value: classId },
      { field: 'date', operator: '==' as const, value: date },
    ],
  }),
};
