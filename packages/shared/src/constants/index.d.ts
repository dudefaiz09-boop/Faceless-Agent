/**
 * SHARED CONSTANTS
 * Centralized source of truth for literals across Web, Mobile, and Functions.
 */
export declare const COLLECTIONS: {
  readonly USERS: 'users';
  readonly ANNOUNCEMENTS: 'announcements';
  readonly ATTENDANCE: 'attendance';
  readonly ASSIGNMENTS: 'assignments';
  readonly CLASSES: 'classes';
  readonly FEES: 'fees';
  readonly MESSAGES: 'messages';
};
export declare const ROLES: {
  readonly ADMIN: 'admin';
  readonly PRINCIPAL: 'principal';
  readonly STAFF: 'staff';
  readonly TEACHER: 'teacher';
  readonly STUDENT: 'student';
  readonly PARENT: 'parent';
  readonly LIBRARIAN: 'librarian';
  readonly ACCOUNTANT: 'accountant';
};
export type UserRole = (typeof ROLES)[keyof typeof ROLES];
export declare const PERMISSIONS: {
  readonly MANAGE_USERS: 'manageUsers';
  readonly MANAGE_ROLES: 'manageRoles';
  readonly MANAGE_MODULES: 'manageModules';
  readonly MANAGE_CLASSES: 'manageClasses';
  readonly MANAGE_SUBJECTS: 'manageSubjects';
  readonly MANAGE_STUDENTS: 'manageStudents';
  readonly MANAGE_TEACHERS: 'manageTeachers';
  readonly MANAGE_LIBRARY: 'manageLibrary';
  readonly MANAGE_FEES: 'manageFees';
  readonly VIEW_AUDIT_LOGS: 'viewAuditLogs';
  readonly USE_AI: 'useAI';
  readonly MANAGE_ANNOUNCEMENTS: 'manageAnnouncements';
  readonly MARK_ATTENDANCE: 'markAttendance';
  readonly VIEW_REPORTS: 'viewReports';
  readonly CREATE_ASSIGNMENTS: 'createAssignments';
  readonly VIEW_GRADES: 'viewGrades';
  readonly PAY_FEES: 'payFees';
};
export declare const API_VERSION = 'v1';
export declare const MIN_MOBILE_VERSION = '1.0.0';
export * from './notifications.js';
