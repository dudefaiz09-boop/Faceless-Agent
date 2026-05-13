import { UserRole } from '../constants/index.js';
import { UserContext } from '../types/index.js';
/**
 * SHARED AUTH LOGIC
 * Consistent role and permission handling for all platforms.
 */
export declare function getUserRole(roles: string[]): UserRole;
export declare function hasPermission(user: UserContext | null, permission: string): boolean;
export declare const AUTH_EVENTS: {
    readonly SIGNED_IN: "signed_in";
    readonly SIGNED_OUT: "signed_out";
    readonly TOKEN_REFRESHED: "token_refreshed";
};
