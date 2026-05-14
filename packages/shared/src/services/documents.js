import { COLLECTIONS } from '../constants/index.js';

export const DocumentQueries = {
  getLatestAnnouncements: (limitCount = 10) => ({
    collection: COLLECTIONS.ANNOUNCEMENTS,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    limit: limitCount,
  }),
  getAnnouncementsForStudent: (classId, limitCount = 10) => ({
    collection: COLLECTIONS.ANNOUNCEMENTS,
    whereConditions: [
      {
        field: 'targetClasses',
        operator: 'array-contains-any',
        value: ['all', ...(classId ? [classId] : [])],
      },
    ],
    orderByField: 'createdAt',
    orderDirection: 'desc',
    limit: limitCount,
  }),
  getAttendanceForDate: (classId, date) => ({
    collection: COLLECTIONS.ATTENDANCE,
    whereConditions: [
      { field: 'classId', operator: '==', value: classId },
      { field: 'date', operator: '==', value: date },
    ],
  }),
};
