export declare const DocumentQueries: {
    getLatestAnnouncements: (limitCount?: number) => {
        collection: string;
        orderByField: string;
        orderDirection: "desc";
        limit: number;
    };
    getAnnouncementsForStudent: (classId: string | null, limitCount?: number) => {
        collection: string;
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
        collection: string;
        whereConditions: ({
            field: string;
            operator: "==";
            value: string;
        })[];
    };
};
