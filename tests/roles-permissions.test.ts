import { canAccessModule, hasPermission } from '../packages/shared/src/roles.ts';
import {
  getAssignmentsCopy,
  getAttendanceCopy,
  getFeesCopy,
  getPerformanceCopy,
  getRoleDashboardActions,
} from '../apps/web/src/lib/role-ui.ts';

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

  it('does not give parents staff dashboard actions', () => {
    const actions = getRoleDashboardActions({
      role: 'parent',
      canManageAttendance: false,
      canManageAssignments: false,
      canManageFees: false,
      canManageLibrary: false,
      isAdmin: false,
      isTeacher: false,
    });
    const titles = actions.map((action) => action.title);

    expect(titles).toContain('Parent Portal');
    expect(titles).not.toContain('Mark attendance');
    expect(titles).not.toContain('Create assignment');
    expect(titles).not.toContain('Post update');
  });

  it('uses child-oriented copy for parent record modules', () => {
    expect(getAttendanceCopy('parent', false).title).toBe("Your kids' attendance");
    expect(getAssignmentsCopy('parent', false).description).toContain('linked children');
    expect(getFeesCopy('parent', false).selector).toBe('Select Child');
    expect(getPerformanceCopy('parent', false).selector).toBe('Select Child');
  });

  it('keeps accountant and librarian actions inside their domains', () => {
    const accountantActions = getRoleDashboardActions({
      role: 'accountant',
      canManageFees: true,
    }).map((action) => action.title);
    const librarianActions = getRoleDashboardActions({
      role: 'librarian',
      canManageLibrary: true,
    }).map((action) => action.title);

    expect(accountantActions).toEqual(['Fee records']);
    expect(librarianActions).toEqual(['Library']);
  });
});
