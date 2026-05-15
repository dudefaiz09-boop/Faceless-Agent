/**
 * SHARED AUTH LOGIC
 * Consistent role and permission handling for all platforms.
 */
export { getUserRole, hasPermission } from '../roles.js';
export declare const AUTH_EVENTS: {
  readonly SIGNED_IN: 'signed_in';
  readonly SIGNED_OUT: 'signed_out';
  readonly TOKEN_REFRESHED: 'token_refreshed';
};
