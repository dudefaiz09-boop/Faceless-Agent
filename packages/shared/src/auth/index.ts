/**
 * SHARED AUTH LOGIC
 * Consistent role and permission handling for all platforms.
 */
export { getUserRole, hasPermission } from '../roles.js';

export const AUTH_EVENTS = {
  SIGNED_IN: 'signed_in',
  SIGNED_OUT: 'signed_out',
  TOKEN_REFRESHED: 'token_refreshed',
} as const;
