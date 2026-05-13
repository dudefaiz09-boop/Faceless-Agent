/**
 * SHARED CONSTANTS
 * Centralized source of truth for literals across Web, Mobile, and Functions.
 */
export declare const COLLECTIONS: {
    readonly USERS: "users";
    readonly ANNOUNCEMENTS: "announcements";
    readonly ATTENDANCE: "attendance";
    readonly ASSIGNMENTS: "assignments";
    readonly CLASSES: "classes";
    readonly FEES: "fees";
    readonly MESSAGES: "messages";
};
export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly STAFF: "staff";
    readonly TEACHER: "teacher";
    readonly STUDENT: "student";
    readonly PARENT: "parent";
};
export type UserRole = (typeof ROLES)[keyof typeof ROLES];
export declare const PERMISSIONS: {
    readonly MANAGE_USERS: "manageUsers";
    readonly MANAGE_ANNOUNCEMENTS: "manageAnnouncements";
    readonly MARK_ATTENDANCE: "markAttendance";
    readonly CREATE_ASSIGNMENTS: "createAssignments";
    readonly VIEW_GRADES: "viewGrades";
    readonly PAY_FEES: "payFees";
};
export declare const API_VERSION = "v1";
export declare const MIN_MOBILE_VERSION = "1.0.0";
export * from './notifications.js';
