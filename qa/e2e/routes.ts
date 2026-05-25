export type QaRole =
  | 'admin'
  | 'principal'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'librarian'
  | 'accountant';

export type QaRoute = {
  name: string;
  path: string;
  module?: string;
  authRequired?: boolean;
  pr?: boolean;
};

export const qaRoles: QaRole[] = [
  'admin',
  'principal',
  'teacher',
  'student',
  'parent',
  'librarian',
  'accountant',
];

export const publicRoutes: QaRoute[] = [
  { name: 'login', path: '/auth/login', pr: true },
  { name: 'register', path: '/auth/register', pr: true },
  { name: 'forgot-password', path: '/auth/forgot-password', pr: true },
];

export const protectedRoutes: QaRoute[] = [
  { name: 'dashboard', path: '/', module: 'dashboard', authRequired: true, pr: true },
  {
    name: 'announcements',
    path: '/announcements',
    module: 'announcements',
    authRequired: true,
    pr: true,
  },
  { name: 'attendance', path: '/attendance', module: 'attendance', authRequired: true, pr: true },
  { name: 'assignments', path: '/assignments', module: 'assignments', authRequired: true },
  { name: 'chat', path: '/chat', module: 'chat', authRequired: true },
  { name: 'library', path: '/library', module: 'library', authRequired: true, pr: true },
  { name: 'fees', path: '/fees', module: 'fees', authRequired: true },
  { name: 'performance', path: '/performance', module: 'performance', authRequired: true },
  { name: 'parent-portal', path: '/parent-portal', module: 'parentPortal', authRequired: true },
  { name: 'students', path: '/students', module: 'students', authRequired: true },
  { name: 'teachers', path: '/teachers', module: 'teachers', authRequired: true },
  { name: 'all-users', path: '/all-users', module: 'allUsers', authRequired: true },
];

export const roleAccessMatrix: Record<QaRole, string[]> = {
  admin: protectedRoutes.map((route) => route.name),
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
  ],
  teacher: [
    'dashboard',
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
    'parent-portal',
  ],
  librarian: ['dashboard', 'announcements', 'chat', 'library'],
  accountant: ['dashboard', 'announcements', 'chat', 'fees'],
};

export const smokeRoutes: QaRoute[] = publicRoutes.concat(protectedRoutes);
export const prRoutes: QaRoute[] = smokeRoutes.filter((route) => route.pr);
export const screenshotRoutes: QaRoute[] = smokeRoutes;

export function canRoleAccessRoute(role: QaRole, route: QaRoute) {
  if (!route.authRequired) return true;
  return roleAccessMatrix[role].includes(route.name);
}
