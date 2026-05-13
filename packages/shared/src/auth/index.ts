import { UserRole, ROLES } from '../constants/index.js';
import { UserContext } from '../types/index.js';

/**
 * SHARED AUTH LOGIC
 * Consistent role and permission handling for all platforms.
 */

export function getUserRole(roles: string[]): UserRole {
  if (roles.includes(ROLES.ADMIN)) return ROLES.ADMIN;
  if (roles.includes(ROLES.STAFF)) return ROLES.STAFF;
  if (roles.includes(ROLES.TEACHER)) return ROLES.TEACHER;
  if (roles.includes(ROLES.PARENT)) return ROLES.PARENT;
  return ROLES.STUDENT;
}

export function hasPermission(user: UserContext | null, permission: string): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return !!user.permissions[permission];
}

export const AUTH_EVENTS = {
  SIGNED_IN: 'signed_in',
  SIGNED_OUT: 'signed_out',
  TOKEN_REFRESHED: 'token_refreshed',
} as const;
