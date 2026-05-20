import type { ModuleKey, PermissionKey, Role } from '../roles.js';
export interface UserContext {
  uid: string;
  email?: string;
  displayName?: string;
  role?: Role;
  roles: Role[];
  isAdmin: boolean;
  classId: string | null;
  classIds?: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds?: string[];
  assignedModules?: ModuleKey[];
  permissions: Record<string, boolean>;
  permissionKeys?: PermissionKey[];
  schoolId?: string | null;
  status?: 'active' | 'inactive';
}
export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  targetClasses: string[];
  visibility: 'school' | 'class' | 'public' | 'private';
  createdAt: string;
}
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
}
