export type TenantScopedRecord = {
  tenantId?: string | null;
  schoolId?: string | null;
};

export type TenantPolicyUser = {
  uid: string;
  role?: string;
  roles?: readonly string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  managedTenantIds?: readonly string[];
  schoolId?: string | null;
  permissions?: Record<string, boolean | undefined>;
  linkedStudentIds?: readonly string[];
};

function hasRole(user: TenantPolicyUser, role: string) {
  return user.role === role || user.roles?.includes(role) === true;
}

function hasPermission(user: TenantPolicyUser, permission: string) {
  return user.permissions?.[permission] === true;
}

export function isTenantScopedRecord(record: TenantScopedRecord | null | undefined, tenantId?: string | null) {
  if (!record || !tenantId) return false;
  return record.tenantId === tenantId || record.schoolId === tenantId;
}

export function canManageTenant(
  user: TenantPolicyUser,
  activeTenantId?: string | null,
  targetTenantId?: string | null
) {
  if (!targetTenantId) return false;
  if (targetTenantId === activeTenantId) return true;
  return user.isSuperAdmin === true && user.managedTenantIds?.includes(targetTenantId) === true;
}

export function assertUserCanManageTenant(
  user: TenantPolicyUser,
  activeTenantId?: string | null,
  targetTenantId?: string | null
) {
  if (!canManageTenant(user, activeTenantId, targetTenantId)) {
    throw Object.assign(new Error('Tenant access denied'), { statusCode: 403 });
  }
}

export function deactivationUpdate(now = new Date().toISOString()) {
  return {
    status: 'inactive' as const,
    deactivatedAt: now,
  };
}

export function canManageUsers(user: TenantPolicyUser) {
  return user.isAdmin === true || hasPermission(user, 'manageUsers') || hasRole(user, 'admin');
}

export function canManageFees(user: TenantPolicyUser) {
  return user.isAdmin === true || hasPermission(user, 'manageFees') || hasRole(user, 'accountant');
}

export function canManageAssignments(user: TenantPolicyUser) {
  return (
    user.isAdmin === true ||
    hasPermission(user, 'manageAssignments') ||
    hasRole(user, 'admin') ||
    hasRole(user, 'teacher')
  );
}

export function canMarkAttendance(user: TenantPolicyUser) {
  return user.isAdmin === true || hasPermission(user, 'markAttendance') || hasRole(user, 'admin');
}

export function canManageLibrary(user: TenantPolicyUser) {
  return (
    user.isAdmin === true ||
    hasPermission(user, 'manageLibrary') ||
    hasRole(user, 'admin') ||
    hasRole(user, 'librarian')
  );
}

export function canAccessOwnOrLinkedStudent(user: TenantPolicyUser, studentId: string) {
  return user.uid === studentId || user.linkedStudentIds?.includes(studentId) === true;
}

export function canViewStudentFees(user: TenantPolicyUser, studentId: string) {
  return (
    canManageFees(user) ||
    user.uid === studentId ||
    (hasPermission(user, 'viewOwnRecords') && user.linkedStudentIds?.includes(studentId) === true)
  );
}

export function canViewStudentAssignments(user: TenantPolicyUser, studentId: string) {
  return (
    user.uid === studentId ||
    user.isAdmin === true ||
    hasPermission(user, 'manageAssignments') ||
    hasPermission(user, 'viewReports') ||
    (hasPermission(user, 'viewOwnRecords') && user.linkedStudentIds?.includes(studentId) === true)
  );
}

export function canViewStudentHistory(user: TenantPolicyUser, studentId: string) {
  return (
    user.isAdmin === true ||
    hasPermission(user, 'viewReports') ||
    canAccessOwnOrLinkedStudent(user, studentId)
  );
}

export function sameTenantPair(
  left: TenantScopedRecord | null | undefined,
  right: TenantScopedRecord | null | undefined,
  tenantId?: string | null
) {
  return isTenantScopedRecord(left, tenantId) && isTenantScopedRecord(right, tenantId);
}
