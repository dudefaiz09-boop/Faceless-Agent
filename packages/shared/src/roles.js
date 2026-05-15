import { ROLES } from './constants/index.js';

export const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.PRINCIPAL,
  ROLES.TEACHER,
  ROLES.STUDENT,
  ROLES.PARENT,
  ROLES.LIBRARIAN,
  ROLES.ACCOUNTANT,
  ROLES.STAFF,
];

export const ROLE_LABELS = {
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
];

export const MODULE_LABELS = {
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
];

export const PERMISSION_LABELS = {
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

export const DEFAULT_ROLE_MODULES = {
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

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: [...ALL_PERMISSIONS],
  principal: ['viewReports', 'createAnnouncements', 'markAttendance', 'viewAuditLogs'],
  teacher: ['useAI', 'createAnnouncements', 'markAttendance', 'viewReports'],
  student: ['useAI'],
  parent: [],
  librarian: ['manageLibrary'],
  accountant: ['manageFees'],
  staff: ['markAttendance'],
};

export function isRole(value) {
  return typeof value === 'string' && ALL_ROLES.includes(value);
}

export function isModuleKey(value) {
  return typeof value === 'string' && ALL_MODULES.includes(value);
}

export function isPermissionKey(value) {
  return typeof value === 'string' && ALL_PERMISSIONS.includes(value);
}

export function getUserRole(roles = []) {
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

export function hasRole(roles, role) {
  return !!roles?.includes(role);
}

export function toPermissionMap(permissions = {}) {
  if (Array.isArray(permissions)) {
    return permissions.reduce((acc, permission) => {
      if (isPermissionKey(permission)) acc[permission] = true;
      return acc;
    }, {});
  }

  return Object.entries(permissions).reduce((acc, [key, value]) => {
    if (isPermissionKey(key) && value) acc[key] = true;
    return acc;
  }, {});
}

export function getDefaultPermissionMap(role) {
  return toPermissionMap(DEFAULT_ROLE_PERMISSIONS[role]);
}

export function hasPermission(user, permission) {
  if (!user || !permission) return false;
  const role = getUserRole(user.roles || []);
  if (user.isAdmin || role === ROLES.ADMIN) return true;
  const explicitPermissions = toPermissionMap(user.permissions || {});
  if (explicitPermissions[permission]) return true;
  if (!isPermissionKey(permission)) return !!user.permissions?.[permission];
  return DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
}

export function getEffectiveModules(role, assignedModules) {
  const safeRole = isRole(role) ? role : ROLES.STUDENT;
  if (safeRole === ROLES.ADMIN) return [...ALL_MODULES];
  const explicitModules = (assignedModules || []).filter(isModuleKey);
  if (explicitModules.length > 0) return explicitModules;
  return DEFAULT_ROLE_MODULES[safeRole];
}

export function canAccessModule(role, module, assignedModules) {
  return getEffectiveModules(role, assignedModules).includes(module);
}
