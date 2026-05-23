import {
  assertUserCanManageTenant,
  canManageAssignments,
  canManageFees,
  canManageLibrary,
  canManageUsers,
  canMarkAttendance,
  canViewStudentAssignments,
  canViewStudentFees,
  canViewStudentHistory,
  deactivationUpdate,
  isTenantScopedRecord,
  sameTenantPair,
  type TenantPolicyUser,
} from '../src/lib/tenant-isolation.js';

function user(patch: Partial<TenantPolicyUser> = {}): TenantPolicyUser {
  return {
    uid: 'student-1',
    role: 'student',
    roles: ['student'],
    schoolId: 'tenant-a',
    permissions: {},
    linkedStudentIds: [],
    ...patch,
  };
}

const admin = user({
  uid: 'admin-1',
  role: 'admin',
  roles: ['admin'],
  isAdmin: true,
});

const parent = user({
  uid: 'parent-1',
  role: 'parent',
  roles: ['parent'],
  permissions: { viewOwnRecords: true },
  linkedStudentIds: ['student-1'],
});

describe('backend tenant isolation policies', () => {
  it('covers user management tenant rules', () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers(user())).toBe(false);
    expect(() => assertUserCanManageTenant(admin, 'tenant-a', 'tenant-a')).not.toThrow();
    expect(() => assertUserCanManageTenant(admin, 'tenant-a', 'tenant-b')).toThrow();
    expect(deactivationUpdate('2026-01-01T00:00:00.000Z').status).toBe('inactive');
  });

  it('covers super-admin managed tenant rules', () => {
    const superAdmin = user({
      ...admin,
      isSuperAdmin: true,
      managedTenantIds: ['tenant-b'],
    });

    expect(() => assertUserCanManageTenant(superAdmin, 'tenant-a', 'tenant-b')).not.toThrow();
    expect(() => assertUserCanManageTenant(superAdmin, 'tenant-a', 'tenant-c')).toThrow();
  });

  it('covers fee tenant and role rules', () => {
    const accountant = user({ role: 'accountant', roles: ['accountant'] });

    expect(isTenantScopedRecord({ tenantId: 'tenant-a' }, 'tenant-a')).toBe(true);
    expect(isTenantScopedRecord({ schoolId: 'tenant-a' }, 'tenant-a')).toBe(true);
    expect(isTenantScopedRecord({ tenantId: 'tenant-b' }, 'tenant-a')).toBe(false);
    expect(canManageFees(accountant)).toBe(true);
    expect(canManageFees(user())).toBe(false);
    expect(canViewStudentFees(user(), 'student-1')).toBe(true);
    expect(canViewStudentFees(parent, 'student-1')).toBe(true);
    expect(canViewStudentFees(parent, 'student-2')).toBe(false);
  });

  it('covers assignment tenant rules', () => {
    const teacher = user({ role: 'teacher', roles: ['teacher'] });

    expect(canManageAssignments(teacher)).toBe(true);
    expect(canManageAssignments(admin)).toBe(true);
    expect(canManageAssignments(user())).toBe(false);
    expect(sameTenantPair({ tenantId: 'tenant-a' }, { schoolId: 'tenant-a' }, 'tenant-a')).toBe(
      true
    );
    expect(sameTenantPair({ tenantId: 'tenant-a' }, { tenantId: 'tenant-b' }, 'tenant-a')).toBe(
      false
    );
    expect(canViewStudentAssignments(parent, 'student-1')).toBe(true);
    expect(canViewStudentAssignments(parent, 'student-2')).toBe(false);
  });

  it('covers attendance tenant rules', () => {
    const staff = user({ permissions: { markAttendance: true } });

    expect(canMarkAttendance(staff)).toBe(true);
    expect(canMarkAttendance(user())).toBe(false);
    expect(isTenantScopedRecord({ tenantId: 'tenant-b' }, 'tenant-a')).toBe(false);
    expect(canViewStudentHistory(user(), 'student-1')).toBe(true);
    expect(canViewStudentHistory(parent, 'student-1')).toBe(true);
    expect(canViewStudentHistory(parent, 'student-2')).toBe(false);
  });

  it('covers library tenant rules', () => {
    const librarian = user({ role: 'librarian', roles: ['librarian'] });

    expect(canManageLibrary(librarian)).toBe(true);
    expect(canManageLibrary(admin)).toBe(true);
    expect(canManageLibrary(user())).toBe(false);
    expect(sameTenantPair({ tenantId: 'tenant-a' }, { schoolId: 'tenant-a' }, 'tenant-a')).toBe(
      true
    );
    expect(sameTenantPair({ tenantId: 'tenant-a' }, { tenantId: 'tenant-b' }, 'tenant-a')).toBe(
      false
    );
  });
});
