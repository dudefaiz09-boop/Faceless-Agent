import { COLLECTIONS } from '../constants/index.js';
/**
 * SHARED FIRESTORE SERVICE
 * Centralized query definitions to ensure Web and Mobile use identical data access patterns.
 */
export const FirestoreQueries = {
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
//# sourceMappingURL=firestore.js.map