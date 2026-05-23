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

const baseUser: TenantPolicyUser = {
  uid: 'user-1',
  roles: ['student'],
  role: 'student',
  schoolId: 'tenant-a',
  permissions: {},
  linkedStudentIds: [],
};

describe('backend tenant isolation policies', () => {
  describe('user management', () => {
    it('allows admins to manage users in the active tenant', () => {
      const admin = { ...baseUser, role: 'admin', roles: ['admin'], isAdmin: true };

      expect(canManageUsers(admin)).toBe(true);
      expect(() => assertUserCanManageTenant(admin, 'tenant-a', 'tenant-a')).not.toThrow();
    });

    it('denies non-admin user management permission', () => {
      expect(canManageUsers(baseUser)).toBe(false);
    });

    it('denies cross-tenant target users for tenant admins', () => {
      const admin = { ...baseUser, role: 'admin', roles: ['admin'], isAdmin: true };

      expect(() => assertUserCanManageTenant(admin, 'tenant-a', 'tenant-b')).toThrow(
        'Tenant access denied'
      );
    });

    it('allows super admins only for explicitly managed tenants', () => {
      const superAdmin = {
        ...baseUser,
        role: 'admin',
        roles: ['admin'],
        isAdmin: true,
        isSuperAdmin: true,
        managedTenantIds: ['tenant-a', 'tenant-b'],
      };

      expect(() => assertUserCanManageTenant(superAdmin, 'tenant-a', 'tenant-b')).not.toThrow();
      expect(() => assertUserCanManageTenant(superAdmin, 'tenant-a', 'tenant-c')).toThrow(
        'Tenant access denied'
      );
    });

    it('models delete requests as deactivation updates', () => {
      expect(deactivationUpdate('2026-01-01T00:00:00.000Z')).toEqual({
        status: 'inactive',
        deactivatedAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  describe('fees', () => {
    it('recognizes tenant-scoped fee records', () => {
      expect(isTenantScopedRecord({ tenantId: 'tenant-a' }, 'tenant-a')).toBe(true);
      expect(isTenantScopedRecord({ schoolId: 'tenant-a' }, 'tenant-a')).toBe(true);
      expect(isTenantScopedRecord({ tenantId: 'tenant-b' }, 'tenant-a')).toBe(false);
    });

    it('allows fee management for admin, accountant, or explicit manageFees permission only', () => {
      expect(canManageFees({ ...baseUser, isAdmin: true })).toBe(true);
      expect(canManageFees({ ...baseUser, role: 'accountant', roles: ['accountant'] })).toBe(
        true
      );
      expect(canManageFees({ ...baseUser, permissions: { manageFees: true } })).toBe(true);
      expect(canManageFees(baseUser)).toBe(false);
    });

    it('limits parent/student fee access to own or linked student records', () => {
      const parent = {
        ...baseUser,
        uid: 'parent-1',
        role: 'parent',
        roles: ['parent'],
        permissions: { viewOwnRecords: true },
        linkedStudentIds: ['student-1'],
      };

      expect(canViewStudentFees({ ...baseUser, uid: 'student-1' }, 'student-1')).toBe(true);
      expect(canViewStudentFees(parent, 'student-1')).toBe(true);
      expect(canViewStudentFees(parent, 'student-2')).toBe(false);
    });
  });

  describe('assignments', () => {
    it('allows teachers and admins to manage tenant assignments', () => {
      expect(canManageAssignments({ ...baseUser, role: 'teacher', roles: ['teacher'] })).toBe(
        true
      );
      expect(canManageAssignments({ ...baseUser, isAdmin: true })).toBe(true);
      expect(canManageAssignments(baseUser)).toBe(false);
    });

    it('requires assignment and submission to belong to the active tenant for recheck', () => {
      const assignment = { tenantId: 'tenant-a' };
      const sameTenantSubmission = { schoolId: 'tenant-a' };
      const crossTenantSubmission = { tenantId: 'tenant-b' };

      expect(sameTenantPair(assignment, sameTenantSubmission, 'tenant-a')).toBe(true);
      expect(sameTenantPair(assignment, crossTenantSubmission, 'tenant-a')).toBe(false);
    });

    it('limits student assignment history to own, linked, or reporting roles', () => {
      const parent = {
        ...baseUser,
        role: 'parent',
        roles: ['parent'],
        permissions: { viewOwnRecords: true },
        linkedStudentIds: ['student-1'],
      };

      expect(canViewStudentAssignments({ ...baseUser, uid: 'student-1' }, 'student-1')).toBe(
        true
      );
      expect(canViewStudentAssignments(parent, 'student-1')).toBe(true);
      expect(canViewStudentAssignments(parent, 'student-2')).toBe(false);
      expect(
        canViewStudentAssignments({ ...baseUser, permissions: { viewReports: true } }, 'student-2')
      ).toBe(true);
    });
  });

  describe('attendance', () => {
    it('requires attendance permission to mark attendance', () => {
      expect(canMarkAttendance({ ...baseUser, permissions: { markAttendance: true } })).toBe(
        true
      );
      expect(canMarkAttendance({ ...baseUser, role: 'admin', roles: ['admin'] })).toBe(true);
      expect(canMarkAttendance(baseUser)).toBe(false);
    });

    it('prevents stable attendance ids from overwriting cross-tenant records', () => {
      expect(isTenantScopedRecord({ tenantId: 'tenant-a' }, 'tenant-a')).toBe(true);
      expect(isTenantScopedRecord({ tenantId: 'tenant-b' }, 'tenant-a')).toBe(false);
    });

    it('blocks student/parent history for unrelated students', () => {
      const parent = {
        ...baseUser,
        role: 'parent',
        roles: ['parent'],
        linkedStudentIds: ['student-1'],
      };

      expect(canViewStudentHistory({ ...baseUser, uid: 'student-1' }, 'student-1')).toBe(true);
      expect(canViewStudentHistory(parent, 'student-1')).toBe(true);
      expect(canViewStudentHistory(parent, 'student-2')).toBe(false);
    });
  });

  describe('library', () => {
    it('allows library writes for librarian, admin, or manageLibrary permission only', () => {
      expect(canManageLibrary({ ...baseUser, role: 'librarian', roles: ['librarian'] })).toBe(
        true
      );
      expect(canManageLibrary({ ...baseUser, isAdmin: true })).toBe(true);
      expect(canManageLibrary({ ...baseUser, permissions: { manageLibrary: true } })).toBe(true);
      expect(canManageLibrary(baseUser)).toBe(false);
    });

    it('checks library resource and borrowing records against active tenant', () => {
      const resource = { tenantId: 'tenant-a' };
      const borrow = { schoolId: 'tenant-a' };
      const crossTenantBorrow = { tenantId: 'tenant-b' };

      expect(sameTenantPair(resource, borrow, 'tenant-a')).toBe(true);
      expect(sameTenantPair(resource, crossTenantBorrow, 'tenant-a')).toBe(false);
    });
  });
});
