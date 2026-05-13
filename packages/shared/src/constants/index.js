/**
 * SHARED CONSTANTS
 * Centralized source of truth for literals across Web, Mobile, and Functions.
 */
export const COLLECTIONS = {
    USERS: 'users',
    ANNOUNCEMENTS: 'announcements',
    ATTENDANCE: 'attendance',
    ASSIGNMENTS: 'assignments',
    CLASSES: 'classes',
    FEES: 'fees',
    MESSAGES: 'messages',
};
export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    TEACHER: 'teacher',
    STUDENT: 'student',
    PARENT: 'parent',
};
export const PERMISSIONS = {
    MANAGE_USERS: 'manageUsers',
    MANAGE_ANNOUNCEMENTS: 'manageAnnouncements',
    MARK_ATTENDANCE: 'markAttendance',
    CREATE_ASSIGNMENTS: 'createAssignments',
    VIEW_GRADES: 'viewGrades',
    PAY_FEES: 'payFees',
};
export const API_VERSION = 'v1';
export const MIN_MOBILE_VERSION = '1.0.0';
export * from './notifications.js';
//# sourceMappingURL=index.js.map