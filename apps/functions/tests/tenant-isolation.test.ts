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
} from "../src/lib/tenant-isolation.js";

const baseUser: TenantPolicyUser = {
  uid: "user-1",
  roles: ["student"],
  role: "student",
  schoolId: "tenant-a",
  permissions: {},
  linkedStudentIds: [],
};

const admin: TenantPolicyUser = {
  ...baseUser,
  role: "admin",
  roles: ["admin"],
  isAdmin: true,
};

describe("backend tenant isolation policies", () => {
  it("covers user management tenant isolation", () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers(baseUser)).toBe(false);
    expect(() => assertUserCanManageTenant(admin, "tenant-a", "tenant-a")).not.toThrow();
    expect(() => assertUserCanManageTenant(admin, "tenant-a", "tenant-b")).toThrow(
      "Tenant access denied",
    );
    expect(deactivationUpdate("2026-01-01T00:00:00.000Z")).toEqual({
      status: "inactive",
      deactivatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("allows super admins only for explicitly managed tenants", () => {
    const superAdmin = {
      ...admin,
      isSuperAdmin: true,
      managedTenantIds: ["tenant-a", "tenant-b"],
    };

    expect(() => assertUserCanManageTenant(superAdmin, "tenant-a", "tenant-b")).not.toThrow();
    expect(() => assertUserCanManageTenant(superAdmin, "tenant-a", "tenant-c")).toThrow(
      "Tenant access denied",
    );
  });

  it("covers fee tenant and role access", () => {
    const parent = {
      ...baseUser,
      uid: "parent-1",
      role: "parent",
      roles: ["parent"],
      permissions: { viewOwnRecords: true },
      linkedStudentIds: ["student-1"],
    };

    expect(isTenantScopedRecord({ tenantId: "tenant-a" }, "tenant-a")).toBe(true);
    expect(isTenantScopedRecord({ schoolId: "tenant-a" }, "tenant-a")).toBe(true);
    expect(isTenantScopedRecord({ tenantId: "tenant-b" }, "tenant-a")).toBe(false);
    expect(canManageFees({ ...baseUser, role: "accountant", roles: ["accountant"] })).toBe(
      true,
    );
    expect(canManageFees(baseUser)).toBe(false);
    expect(canViewStudentFees({ ...baseUser, uid: "student-1" }, "student-1")).toBe(true);
    expect(canViewStudentFees(parent, "student-1")).toBe(true);
    expect(canViewStudentFees(parent, "student-2")).toBe(false);
  });

  it("covers assignment management and submission tenant pairing", () => {
    const parent = {
      ...baseUser,
      role: "parent",
      roles: ["parent"],
      permissions: { viewOwnRecords: true },
      linkedStudentIds: ["student-1"],
    };

    expect(canManageAssignments({ ...baseUser, role: "teacher", roles: ["teacher"] })).toBe(
      true,
    );
    expect(canManageAssignments(admin)).toBe(true);
    expect(canManageAssignments(baseUser)).toBe(false);
    expect(sameTenantPair({ tenantId: "tenant-a" }, { schoolId: "tenant-a" }, "tenant-a")).toBe(
      true,
    );
    expect(sameTenantPair({ tenantId: "tenant-a" }, { tenantId: "tenant-b" }, "tenant-a")).toBe(
      false,
    );
    expect(canViewStudentAssignments(parent, "student-1")).toBe(true);
    expect(canViewStudentAssignments(parent, "student-2")).toBe(false);
  });

  it("covers attendance tenant and history access", () => {
    const parent = { ...baseUser, role: "parent", roles: ["parent"], linkedStudentIds: ["student-1"] };

    expect(canMarkAttendance({ ...baseUser, permissions: { markAttendance: true } })).toBe(true);
    expect(canMarkAttendance(baseUser)).toBe(false);
    expect(isTenantScopedRecord({ tenantId: "tenant-b" }, "tenant-a")).toBe(false);
    expect(canViewStudentHistory({ ...baseUser, uid: "student-1" }, "student-1")).toBe(true);
    expect(canViewStudentHistory(parent, "student-1")).toBe(true);
    expect(canViewStudentHistory(parent, "student-2")).toBe(false);
  });

  it("covers library write and cross-tenant resource access", () => {
    expect(canManageLibrary({ ...baseUser, role: "librarian", roles: ["librarian"] })).toBe(
      true,
    );
    expect(canManageLibrary(admin)).toBe(true);
    expect(canManageLibrary(baseUser)).toBe(false);
    expect(sameTenantPair({ tenantId: "tenant-a" }, { schoolId: "tenant-a" }, "tenant-a")).toBe(
      true,
    );
    expect(sameTenantPair({ tenantId: "tenant-a" }, { tenantId: "tenant-b" }, "tenant-a")).toBe(
      false,
    );
  });
});
