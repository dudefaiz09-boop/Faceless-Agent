/**
 * SHARED FIRESTORE SERVICE
 * Centralized query definitions to ensure Web and Mobile use identical data access patterns.
 */
export declare const FirestoreQueries: {
    getLatestAnnouncements: (limitCount?: number) => {
        collection: "announcements";
        orderByField: string;
        orderDirection: "desc";
        limit: number;
    };
    getAnnouncementsForStudent: (classId: string | null, limitCount?: number) => {
        collection: "announcements";
        whereConditions: {
            field: string;
            operator: "array-contains-any";
            value: string[];
        }[];
        orderByField: string;
        orderDirection: "desc";
        limit: number;
    };
    getAttendanceForDate: (classId: string, date: string) => {
        collection: "attendance";
        whereConditions: {
            field: string;
            operator: "==";
            value: string;
        }[];
    };
};
