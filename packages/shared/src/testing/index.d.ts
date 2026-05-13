import { Announcement, UserContext } from '../types/index.js';
/**
 * SHARED TESTING UTILS
 * Generates consistent mock data for contract and parity tests.
 */
export declare const MockGenerator: {
    announcement: (overrides?: Partial<Announcement>) => Announcement;
    user: (overrides?: Partial<UserContext>) => UserContext;
};
