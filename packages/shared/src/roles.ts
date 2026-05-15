import { ROLES } from './constants/index.js';

type PermissionUser = {
  roles?: readonly string[];
  isAdmin?: boolean;
  permissions?: Record<string, boolean>;
};

export const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.PRINCIPAL,
  ROLES.TEACHER,
  ROLES.STUDENT,
  ROLES.PARENT,
  ROLES.LIBRARIAN,
  ROLES.ACCOUNTANT,
  ROLES.STAFF,
] as const;

export type Role = (typeof ALL_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  principal: 'Principal',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  librarian: 'Librarian',
  accountant: 'Accountant',
  staff: 'Staff',
};

export const ALL_MODULES = [
  'dashboard',
  'aiAssistant',
  'announcements',
  'attendance',
  'assignments',
  'chat',
  'library',
  'fees',
  'performance',
  'students',
  'teachers',
  'allUsers',
  'parentPortal',
  'auditLogs',
  'settings',
] as const;

export type ModuleKey = (typeof ALL_MODULES)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  aiAssistant: 'AI Assistant',
  announcements: 'Announcements',
  attendance: 'Attendance',
  assignments: 'Assignments',
  chat: 'Chat',
  library: 'Library',
  fees: 'Fees',
  performance: 'Performance',
  students: 'Students',
  teachers: 'Teachers',
  allUsers: 'All Users',
  parentPortal: 'Parent Portal',
  auditLogs: 'Audit Logs',
  settings: 'Settings',
};

export const ALL_PERMISSIONS = [
  'manageUsers',
  'manageRoles',
  'manageModules',
  'manageClasses',
  'manageSubjects',
  'manageStudents',
  'manageTeachers',
  'manageLibrary',
  'manageFees',
  'viewAuditLogs',
  'useAI',
  'createAnnouncements',
  'markAttendance',
  'viewReports',
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manageUsers: 'Manage users',
  manageRoles: 'Manage roles',
  manageModules: 'Manage modules',
  manageClasses: 'Manage classes',
  manageSubjects: 'Manage subjects',
  manageStudents: 'Manage students',
  manageTeachers: 'Manage teachers',
  manageLibrary: 'Manage library',
  manageFees: 'Manage fees',
  viewAuditLogs: 'View audit logs',
  useAI: 'Use AI',
  createAnnouncements: 'Create announcements',
  markAttendance: 'Mark attendance',
  viewReports: 'View reports',
};

export const DEFAULT_ROLE_MODULES: Record<Role, ModuleKey[]> = {
  admin: [...ALL_MODULES],
  principal: [
    'dashboard',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'library',
    'fees',
    'performance',
    'students',
    'teachers',
    'auditLogs',
  ],
  teacher: [
    'dashboard',
    'aiAssistant',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'library',
    'performance',
    'students',
  ],
  student: [
    'dashboard',
    'aiAssistant',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'library',
    'fees',
    'performance',
  ],
  parent: [
    'dashboard',
    'announcements',
    'attendance',
    'assignments',
    'chat',
    'fees',
    'performance',
    'parentPortal',
  ],
  librarian: ['dashboard', 'announcements', 'chat', 'library'],
  accountant: ['dashboard', 'announcements', 'chat', 'fees'],
  staff: ['dashboard', 'announcements', 'attendance', 'chat', 'students'],
};

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  admin: [...ALL_PERMISSIONS],
  principal: ['viewReports', 'createAnnouncements', 'markAttendance', 'viewAuditLogs'],
  teacher: ['useAI', 'createAnnouncements', 'markAttendance', 'viewReports'],
  student: ['useAI'],
  parent: [],
  librarian: ['manageLibrary'],
  accountant: ['manageFees'],
  staff: ['markAttendance'],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ALL_ROLES.includes(value as Role);
}

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === 'string' && ALL_MODULES.includes(value as ModuleKey);
}

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === 'string' && ALL_PERMISSIONS.includes(value as PermissionKey);
}

export function getUserRole(roles: readonly string[] = []): Role {
  if (roles.includes(ROLES.ADMIN)) return ROLES.ADMIN;
  if (roles.includes(ROLES.PRINCIPAL)) return ROLES.PRINCIPAL;
  if (roles.includes(ROLES.TEACHER)) return ROLES.TEACHER;
  if (roles.includes(ROLES.STUDENT)) return ROLES.STUDENT;
  if (roles.includes(ROLES.PARENT)) return ROLES.PARENT;
  if (roles.includes(ROLES.LIBRARIAN)) return ROLES.LIBRARIAN;
  if (roles.includes(ROLES.ACCOUNTANT)) return ROLES.ACCOUNTANT;
  if (roles.includes(ROLES.STAFF)) return ROLES.STAFF;
  return ROLES.STUDENT;
}

export function hasRole(roles: readonly string[] | null | undefined, role: Role): boolean {
  return !!roles?.includes(role);
}

export function toPermissionMap(permissions: readonly string[] | Record<string, boolean> = {}) {
  if (Array.isArray(permissions)) {
    return permissions.reduce<Record<string, boolean>>((acc, permission) => {
      if (isPermissionKey(permission)) acc[permission] = true;
      return acc;
    }, {});
  }

  return Object.entries(permissions).reduce<Record<string, boolean>>((acc, [key, value]) => {
    if (isPermissionKey(key) && value) acc[key] = true;
    return acc;
  }, {});
}

export function getDefaultPermissionMap(role: Role) {
  return toPermissionMap(DEFAULT_ROLE_PERMISSIONS[role]);
}

export function hasPermission(user: PermissionUser | null | undefined, permission: string): boolean {
  if (!user || !permission) return false;
  const role = getUserRole(user.roles || []);
  if (user.isAdmin || role === ROLES.ADMIN) return true;

  const explicitPermissions = toPermissionMap(user.permissions || {});
  if (explicitPermissions[permission]) return true;

  if (!isPermissionKey(permission)) return !!user.permissions?.[permission];

  return DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
}

export function getEffectiveModules(
  role: string | null | undefined,
  assignedModules?: readonly string[] | null
): ModuleKey[] {
  const safeRole = isRole(role) ? role : ROLES.STUDENT;
  if (safeRole === ROLES.ADMIN) return [...ALL_MODULES];

  const explicitModules = (assignedModules || []).filter(isModuleKey);
  if (explicitModules.length > 0) return explicitModules;

  return DEFAULT_ROLE_MODULES[safeRole];
}

export function canAccessModule(
  role: string | null | undefined,
  module: ModuleKey,
  assignedModules?: readonly string[] | null
): boolean {
  return getEffectiveModules(role, assignedModules).includes(module);
}
