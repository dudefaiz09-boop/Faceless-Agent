import { canAccessModule, hasPermission } from '../packages/shared/src/roles.ts';

describe('Role/module access helpers', () => {
  it('denies permissions when user is missing', () => {
    expect(hasPermission(null, 'manageFees')).toBe(false);
  });

  it('grants all permissions to admin', () => {
    expect(hasPermission({ roles: ['admin'] }, 'manageFees')).toBe(true);
    expect(hasPermission({ isAdmin: true, roles: [] }, 'nonStandardPermission')).toBe(true);
  });

  it('enforces default role permissions', () => {
    expect(hasPermission({ roles: ['teacher'] }, 'manageFees')).toBe(false);
    expect(hasPermission({ roles: ['accountant'] }, 'manageFees')).toBe(true);
  });

  it('uses assignedModules when present', () => {
    expect(canAccessModule('teacher', 'fees')).toBe(false);
    expect(canAccessModule('teacher', 'fees', ['fees'])).toBe(true);
  });
});
