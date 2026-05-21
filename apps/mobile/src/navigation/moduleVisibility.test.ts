import { canAccessModule } from '@educonnect/shared';

describe('mobile module visibility', () => {
  it('keeps admin-only All Users hidden from students', () => {
    expect(canAccessModule('student', 'allUsers')).toBe(false);
  });

  it('keeps the primary mobile modules available to students when defaults apply', () => {
    expect(canAccessModule('student', 'dashboard')).toBe(true);
    expect(canAccessModule('student', 'announcements')).toBe(true);
    expect(canAccessModule('student', 'assignments')).toBe(true);
    expect(canAccessModule('student', 'chat')).toBe(true);
  });

  it('honors explicit assigned module allow-lists', () => {
    expect(canAccessModule('teacher', 'assignments', ['dashboard'])).toBe(false);
    expect(canAccessModule('teacher', 'dashboard', ['dashboard'])).toBe(true);
  });
});
