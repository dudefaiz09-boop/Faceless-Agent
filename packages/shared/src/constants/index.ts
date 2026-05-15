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
} as const;

export const ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  LIBRARIAN: 'librarian',
  ACCOUNTANT: 'accountant',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  MANAGE_USERS: 'manageUsers',
  MANAGE_ROLES: 'manageRoles',
  MANAGE_MODULES: 'manageModules',
  MANAGE_CLASSES: 'manageClasses',
  MANAGE_SUBJECTS: 'manageSubjects',
  MANAGE_STUDENTS: 'manageStudents',
  MANAGE_TEACHERS: 'manageTeachers',
  MANAGE_LIBRARY: 'manageLibrary',
  MANAGE_FEES: 'manageFees',
  VIEW_AUDIT_LOGS: 'viewAuditLogs',
  USE_AI: 'useAI',
  MANAGE_ANNOUNCEMENTS: 'manageAnnouncements',
  MARK_ATTENDANCE: 'markAttendance',
  VIEW_REPORTS: 'viewReports',
  CREATE_ASSIGNMENTS: 'createAssignments',
  VIEW_GRADES: 'viewGrades',
  PAY_FEES: 'payFees',
} as const;

export const API_VERSION = 'v1';
export const MIN_MOBILE_VERSION = '1.0.0';

export * from './notifications.js';
