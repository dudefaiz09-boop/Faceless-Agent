import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole, ROLES, getUserRole, hasPermission } from '@educonnect/shared';
import { supabase } from '../lib/supabase';
import { clearStoredTenantId, resolveActiveTenantId, setStoredTenantId } from '../lib/tenant';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface AuthenticatedUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean | null;
  isAnonymous?: boolean | null;
  getIdToken: () => Promise<string | null>;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

let latestAuthInfo: FirestoreErrorInfo['authInfo'] = {};

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: latestAuthInfo,
    operationType,
    path,
  };
  console.error('Firestore compatibility error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  role: UserRole | null;
  roles: string[];
  permissions: Record<string, boolean>;
  schoolId: string | null;
  classId: string | null;
  classIds: string[];
  subjectIds: string[];
  sectionIds: string[];
  assignedModules: string[];
  linkedStudentIds: string[];
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  managedTenantIds: string[];
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  canManageAttendance: boolean;
  canManageAssignments: boolean;
  canManageLibrary: boolean;
  canManageFees: boolean;
  canManagePerformance: boolean;
}

type UserProfileData = {
  role?: string;
  roles?: string[];
  permissions?: Record<string, boolean>;
  schoolId?: string | null;
  tenantId?: string | null;
  defaultTenantId?: string | null;
  is_super_admin?: boolean;
  isSuperAdmin?: boolean;
  managed_tenant_ids?: string[];
  managedTenantIds?: string[];
  classId?: string | null;
  classIds?: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  assignedModules?: string[];
  linkedStudentIds?: string[];
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  roles: [],
  permissions: {},
  schoolId: null,
  classId: null,
  classIds: [],
  subjectIds: [],
  sectionIds: [],
  assignedModules: [],
  linkedStudentIds: [],
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  managedTenantIds: [],
  isTeacher: false,
  isStudent: false,
  isParent: false,
  canManageAttendance: false,
  canManageAssignments: false,
  canManageLibrary: false,
  canManageFees: false,
  canManagePerformance: false,
});

export const useAuth = () => useContext(AuthContext);

function toAuthenticatedUser(user: SupabaseUser, accessToken: string | null): AuthenticatedUser {
  const metadata = user.user_metadata || {};
  return {
    uid: user.id,
    email: user.email,
    displayName: metadata.display_name || metadata.full_name || user.email,
    photoURL: metadata.avatar_url || null,
    emailVerified: !!user.email_confirmed_at,
    isAnonymous: user.is_anonymous,
    getIdToken: async () => accessToken,
  };
}

async function getProfile(uid: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('data')
    .eq('collection', 'users')
    .eq('id', uid)
    .maybeSingle();

  if (error) throw error;
  return (data?.data || {}) as UserProfileData;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [managedTenantIds, setManagedTenantIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [assignedModules, setAssignedModules] = useState<string[]>([]);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setRoles([]);
      setPermissions({});
      setSchoolId(null);
      setClassId(null);
      setClassIds([]);
      setSubjectIds([]);
      setSectionIds([]);
      setAssignedModules([]);
      setLinkedStudentIds([]);
      clearStoredTenantId();
      latestAuthInfo = {};
      setLoading(false);
      return;
    }

    const authUser = toAuthenticatedUser(session.user, session.access_token);
    setUser(authUser);
    latestAuthInfo = {
      userId: authUser.uid,
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      isAnonymous: authUser.isAnonymous,
    };

    try {
      const profile = await getProfile(session.user.id);
      const appMetadata = session.user.app_metadata || {};
      const nextIsSuperAdmin =
        !!profile.is_super_admin || !!profile.isSuperAdmin || !!appMetadata.isSuperAdmin;
      const nextManagedTenantIds =
        profile.managed_tenant_ids ||
        profile.managedTenantIds ||
        appMetadata.managedTenantIds ||
        [];

      setIsSuperAdmin(nextIsSuperAdmin);
      setManagedTenantIds(nextManagedTenantIds);

      const nextRoles = profile.roles || appMetadata.roles || [];
      const nextPermissions = profile.permissions || appMetadata.permissions || {};
      const profileTenantId =
        profile.tenantId ||
        profile.schoolId ||
        appMetadata.tenantId ||
        appMetadata.schoolId ||
        null;
      const nextSchoolId = resolveActiveTenantId({
        isSuperAdmin: nextIsSuperAdmin,
        managedTenantIds: nextManagedTenantIds,
        profileTenantId,
        defaultTenantId: profile.defaultTenantId || appMetadata.defaultTenantId || 'tenant-a',
      });

      setRoles(nextRoles);
      setPermissions(nextPermissions);
      setSchoolId(nextSchoolId);
      const nextClassId = profile.classId || appMetadata.classId || null;
      const nextClassIds =
        profile.classIds || appMetadata.classIds || (nextClassId ? [nextClassId] : []);
      setClassId(nextClassId);
      setClassIds(nextClassIds);
      setSubjectIds(profile.subjectIds || appMetadata.subjectIds || []);
      setSectionIds(profile.sectionIds || appMetadata.sectionIds || []);
      setAssignedModules(profile.assignedModules || appMetadata.assignedModules || []);
      setLinkedStudentIds(profile.linkedStudentIds || appMetadata.linkedStudentIds || []);

      if (nextSchoolId) {
        setStoredTenantId(nextSchoolId);
      }
    } catch (error) {
      console.error('Error fetching Supabase profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const role = getUserRole(roles);
  const permissionUser = {
    uid: user?.uid || '',
    roles: role ? [role] : [],
    isAdmin: roles.includes(ROLES.ADMIN) || isSuperAdmin,
    isSuperAdmin,
    managedTenantIds,
    classId,
    permissions,
  };

  const value = {
    user,
    role,
    roles,
    permissions,
    schoolId,
    classId,
    classIds,
    subjectIds,
    sectionIds,
    assignedModules,
    linkedStudentIds,
    loading,
    isAdmin: roles.includes(ROLES.ADMIN) || isSuperAdmin,
    isSuperAdmin,
    managedTenantIds,
    isTeacher: roles.includes(ROLES.TEACHER),
    isStudent: roles.includes(ROLES.STUDENT),
    isParent: roles.includes(ROLES.PARENT),
    canManageAttendance:
      hasPermission(permissionUser, 'markAttendance') || !!permissions.manageAttendance,
    canManageAssignments: !!permissions.manageAssignments,
    canManageLibrary: hasPermission(permissionUser, 'manageLibrary'),
    canManageFees: hasPermission(permissionUser, 'manageFees'),
    canManagePerformance:
      hasPermission(permissionUser, 'viewReports') || !!permissions.managePerformance,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
