import {
  ALL_MODULES,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_MODULES,
  getDefaultPermissionMap,
  isModuleKey,
  isPermissionKey,
  isRole,
  type ModuleKey,
  type PermissionKey,
  type Role,
} from '@educonnect/shared';
import { auth, db } from './documents.js';
import { getTenantId } from './context.js';

export type ManagedUserPayload = {
  email?: string;
  password?: string;
  displayName?: string;
  role?: string;
  roles?: string[];
  permissions?: Record<string, boolean> | string[];
  assignedModules?: string[];
  classIds?: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds?: string[];
  tenantId?: string;
  status?: 'active' | 'inactive';
  phone?: string;
  admissionNumber?: string;
  employeeId?: string;
};

type Actor = {
  uid: string;
  email?: string;
  schoolId?: string | null;
};

const LEGACY_ROLE_PERMISSIONS: Record<Role, Record<string, boolean>> = {
  admin: {
    manageUsers: true,
    manageTeachers: true,
    manageStudents: true,
    manageAnnouncements: true,
    manageAttendance: true,
    viewAttendance: true,
    manageAssignments: true,
    manageLibrary: true,
    manageFees: true,
    managePerformance: true,
    viewPerformance: true,
    viewStudentDetails: true,
  },
  principal: {
    manageAnnouncements: true,
    viewAttendance: true,
    viewPerformance: true,
    viewStudentDetails: true,
  },
  teacher: {
    manageAnnouncements: true,
    manageAssignments: true,
    markAttendance: true,
    viewAttendance: true,
    viewPerformance: true,
    viewStudentDetails: true,
  },
  student: {
    viewOwnRecords: true,
    submitAssignments: true,
    payFees: true,
  },
  parent: {
    viewOwnRecords: true,
  },
  librarian: {
    manageLibrary: true,
    viewAssignments: true,
  },
  accountant: {
    manageFees: true,
  },
  staff: {
    viewAttendance: true,
    viewStudentDetails: true,
  },
};

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function resolveRole(payload: ManagedUserPayload, existing?: Record<string, any>): Role {
  const requestedRole =
    payload.role || payload.roles?.[0] || existing?.role || existing?.roles?.[0];
  if (!isRole(requestedRole)) {
    throw Object.assign(new Error('Invalid role'), { statusCode: 400 });
  }
  return requestedRole;
}

function resolveModules(role: Role, payload: ManagedUserPayload, existing?: Record<string, any>) {
  if (role === 'admin') return [...ALL_MODULES];

  const source = payload.assignedModules ?? existing?.assignedModules;
  const modules = arrayOfStrings(source).filter(isModuleKey);
  return modules.length > 0 ? modules : DEFAULT_ROLE_MODULES[role];
}

function resolvePermissions(
  role: Role,
  payload: ManagedUserPayload,
  existing?: Record<string, any>
) {
  const basePermissions = {
    ...getDefaultPermissionMap(role),
    ...LEGACY_ROLE_PERMISSIONS[role],
  };

  const source = payload.permissions ?? existing?.permissions;
  if (!source) return basePermissions;

  if (Array.isArray(source)) {
    return source.reduce<Record<string, boolean>>(
      (acc, permission) => {
        const key = String(permission);
        if (isPermissionKey(key) || key in LEGACY_ROLE_PERMISSIONS.admin) acc[key] = true;
        return acc;
      },
      { ...basePermissions }
    );
  }

  return Object.entries(source).reduce<Record<string, boolean>>(
    (acc, [permission, value]) => {
      if ((isPermissionKey(permission) || permission in LEGACY_ROLE_PERMISSIONS.admin) && value) {
        acc[permission] = true;
      }
      return acc;
    },
    { ...basePermissions }
  );
}

function resolveStatus(status: unknown, existing?: Record<string, any>) {
  if (status === 'inactive') return 'inactive';
  if (status === 'active') return 'active';
  return existing?.status === 'inactive' ? 'inactive' : 'active';
}

function resolveClassIds(payload: ManagedUserPayload, existing?: Record<string, any>) {
  const explicit = payload.classIds ?? existing?.classIds;
  const values = arrayOfStrings(explicit);
  if (values.length > 0) return values;

  const legacyClassId = payload.classIds?.[0] || existing?.classId;
  return legacyClassId ? [legacyClassId] : [];
}

function getChangedKeys(before: Record<string, any>, after: Record<string, any>) {
  return [
    'role',
    'roles',
    'permissions',
    'assignedModules',
    'classIds',
    'subjectIds',
    'sectionIds',
    'linkedStudentIds',
    'status',
  ].filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}

async function countActiveAdmins() {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.filter((doc) => {
    const data = doc.data() || {};
    return (data.role === 'admin' || data.roles?.includes('admin')) && data.status !== 'inactive';
  }).length;
}

export async function ensureAdminChangeIsSafe(
  targetUid: string,
  actorUid: string,
  before: Record<string, any>,
  after: Record<string, any>
) {
  const wasAdmin = before.role === 'admin' || before.roles?.includes('admin');
  const remainsActiveAdmin =
    (after.role === 'admin' || after.roles?.includes('admin')) && after.status !== 'inactive';

  if (!wasAdmin || remainsActiveAdmin) return;

  const activeAdmins = await countActiveAdmins();
  if (activeAdmins <= 1) {
    throw Object.assign(new Error('Cannot remove or deactivate the last admin account'), {
      statusCode: 400,
    });
  }

  if (targetUid === actorUid && activeAdmins <= 1) {
    throw Object.assign(new Error('Cannot demote yourself unless another admin exists'), {
      statusCode: 400,
    });
  }
}

export function buildManagedUserProfile(
  uid: string,
  payload: ManagedUserPayload,
  actor: Actor,
  existing: Record<string, any> = {}
) {
  const role = resolveRole(payload, existing);
  const roles = [role];
  const classIds = resolveClassIds(payload, existing);
  const subjectIds = arrayOfStrings(payload.subjectIds ?? existing.subjectIds);
  const sectionIds = arrayOfStrings(payload.sectionIds ?? existing.sectionIds);
  const linkedStudentIds = arrayOfStrings(payload.linkedStudentIds ?? existing.linkedStudentIds);
  const permissions = resolvePermissions(role, payload, existing);
  const assignedModules = resolveModules(role, payload, existing);
  const now = new Date().toISOString();
  const tenantId = payload.tenantId || actor.schoolId || existing.tenantId || existing.schoolId;

  if (!tenantId) {
    throw Object.assign(new Error('Tenant Context Required'), { statusCode: 400 });
  }

  return {
    ...existing,
    uid,
    email: payload.email || existing.email,
    displayName: payload.displayName || existing.displayName || payload.email || existing.email,
    phone: payload.phone ?? existing.phone ?? null,
    admissionNumber: payload.admissionNumber ?? existing.admissionNumber ?? null,
    employeeId: payload.employeeId ?? existing.employeeId ?? null,
    role,
    roles,
    isAdmin: role === 'admin',
    permissions,
    permissionKeys: Object.keys(permissions).filter((permission) => permissions[permission]),
    assignedModules,
    classId: classIds[0] || null,
    classIds,
    classes: classIds,
    subjectIds,
    subjects: subjectIds,
    sectionIds,
    section: sectionIds[0] || existing.section || null,
    linkedStudentIds,
    status: resolveStatus(payload.status, existing),
    schoolId: tenantId,
    tenantId,
    updatedAt: now,
    updatedBy: actor.uid,
    createdAt: existing.createdAt || now,
  };
}

export function buildClaims(profile: Record<string, any>) {
  return {
    role: profile.role,
    roles: profile.roles,
    isAdmin: profile.isAdmin,
    isSuperAdmin: profile.isSuperAdmin,
    managedTenantIds: profile.managedTenantIds,
    permissions: profile.permissions,
    schoolId: profile.schoolId,
    classId: profile.classId,
    classIds: profile.classIds,
    subjectIds: profile.subjectIds,
    sectionIds: profile.sectionIds,
    linkedStudentIds: profile.linkedStudentIds,
    assignedModules: profile.assignedModules,
    status: profile.status,
  };
}

export async function writeAuditLog(args: {
  action: string;
  targetUid: string;
  performedBy: string;
  details: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  schoolId?: string | null;
}) {
  let contextTenantId: string | null;
  try {
    contextTenantId = getTenantId();
  } catch {
    contextTenantId = null;
  }
  const tenantId = args.schoolId || contextTenantId;
  if (!tenantId) {
    throw Object.assign(new Error('Tenant Context Required'), { statusCode: 400 });
  }

  await db.collection('auditLogs').add({
    action: args.action,
    targetUid: args.targetUid,
    performedBy: args.performedBy,
    details: args.details,
    before: args.before || null,
    after: args.after || null,
    timestamp: new Date().toISOString(),
    schoolId: tenantId,
    tenantId,
  });
}

export async function updateManagedUser(
  uid: string,
  payload: ManagedUserPayload,
  actor: Actor,
  action = 'user_updated'
) {
  const userRef = db.collection('users').doc(uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw Object.assign(new Error('User profile not found'), { statusCode: 404 });
  }

  const before = snapshot.data() || {};
  const after = buildManagedUserProfile(uid, payload, actor, before);
  await ensureAdminChangeIsSafe(uid, actor.uid, before, after);

  await userRef.update(after);
  await auth.setCustomUserClaims(uid, buildClaims(after));

  // Update user_tenants if schoolId changed
  if (before.schoolId !== after.schoolId) {
    const supabase = (auth as any).getSupabaseAdmin ? (auth as any).getSupabaseAdmin() : null;
    if (supabase) {
      await supabase.from('user_tenants').upsert(
        {
          user_id: uid,
          email: after.email,
          tenant_id: after.schoolId,
          role: after.role,
          is_default: true,
          is_active: after.status === 'active',
        },
        { onConflict: 'email,tenant_id' }
      );
    }
  }

  const changedKeys = getChangedKeys(before, after);
  await writeAuditLog({
    action,
    targetUid: uid,
    performedBy: actor.uid,
    details: changedKeys.length
      ? `Updated ${changedKeys.join(', ')} for ${after.email || uid}`
      : `Updated profile for ${after.email || uid}`,
    before,
    after,
    schoolId: after.schoolId,
  });

  return after;
}

export async function createManagedUser(payload: ManagedUserPayload, actor: Actor) {
  if (!payload.email || !payload.password || !payload.displayName || !payload.role) {
    throw Object.assign(new Error('email, password, displayName, and role are required'), {
      statusCode: 400,
    });
  }

  const userRecord = await auth.createUser({
    email: payload.email,
    password: payload.password,
    displayName: payload.displayName,
  });

  const profile = buildManagedUserProfile(userRecord.uid, payload, actor);
  await db.collection('users').doc(userRecord.uid).set(profile);
  await auth.setCustomUserClaims(userRecord.uid, buildClaims(profile));

  // Link user to tenant in user_tenants table
  const supabase = (auth as any).getSupabaseAdmin ? (auth as any).getSupabaseAdmin() : null;
  if (supabase) {
    await supabase.from('user_tenants').upsert(
      {
        user_id: userRecord.uid,
        email: profile.email,
        tenant_id: profile.schoolId,
        role: profile.role,
        is_default: true,
        is_active: profile.status === 'active',
      },
      { onConflict: 'email,tenant_id' }
    );
  }

  await writeAuditLog({
    action: 'user_created',
    targetUid: userRecord.uid,
    performedBy: actor.uid,
    details: `Created ${profile.role} account for ${profile.email}`,
    before: null,
    after: profile,
    schoolId: profile.schoolId,
  });

  return profile;
}

export const ROLE_PERMISSION_KEYS = ALL_PERMISSIONS as readonly PermissionKey[];
export const ROLE_MODULE_KEYS = ALL_MODULES as readonly ModuleKey[];
