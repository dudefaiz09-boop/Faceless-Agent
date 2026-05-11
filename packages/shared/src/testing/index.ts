import { Announcement, UserContext } from '../types/index.js';
import { ROLES } from '../constants/index.js';

/**
 * SHARED TESTING UTILS
 * Generates consistent mock data for contract and parity tests.
 */

export const MockGenerator = {
  announcement: (overrides: Partial<Announcement> = {}): Announcement => ({
    id: 'test-id',
    title: 'Mock Announcement',
    content: 'This is a mock announcement content.',
    authorId: 'author-123',
    targetClasses: ['all'],
    visibility: 'school',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  user: (overrides: Partial<UserContext> = {}): UserContext => ({
    uid: 'user-123',
    email: 'test@educonnect.app',
    displayName: 'Test User',
    roles: [ROLES.STUDENT],
    isAdmin: false,
    classId: '10A',
    permissions: {},
    ...overrides,
  }),
};
