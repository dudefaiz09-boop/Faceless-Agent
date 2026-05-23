import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole, ROLES, getUserRole, hasPermission } from '@educonnect/shared';
import { supabase } from '../lib/supabase';
import {
  clearStoredTenantId,
  isValidTenantId,
  resolveActiveTenantId,
  setStoredTenantId,
} from '../lib/tenant';
import { getAuthErrorMessage } from '../lib/auth-errors';
import { useToast } from '../components/saas/ToastProvider';

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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (args: { email: string; password: string; displayName: string }) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

type UserProfileData = {
  status?: string;
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
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  sendPasswordReset: async () => {},
  updatePassword: async () => {},
  refreshProfile: async () => {},
  switchTenant: async () => {},
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
  const { toast } = useToast();
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
      if (profile.status === 'inactive') {
        toast({
          tone: 'error',
          title: 'Access Denied',
          description: 'This account has been deactivated.',
        });
        void supabase.auth.signOut();
        return;
      }
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
        defaultTenantId: profile.defaultTenantId || appMetadata.defaultTenantId || null,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
    if (!data.session) {
      throw new Error('Sign in did not return a valid session. Please try again.');
    }
    toast({ tone: 'success', title: 'Signed in', description: 'Welcome back to EduConnect.' });
  };

  const signUp = async ({
    email,
    password,
    displayName,
  }: {
    email: string;
    password: string;
    displayName: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }

    if (data.user && !data.session) {
      toast({
        tone: 'success',
        title: 'Check your email',
        description: 'Confirm your email address before signing in.',
      });
      return;
    }

    toast({ tone: 'success', title: 'Account created', description: 'Your account is ready.' });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
    clearStoredTenantId();
    toast({ tone: 'success', title: 'Signed out', description: 'Your session has ended.' });
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
    toast({
      tone: 'success',
      title: 'Reset email sent',
      description: 'Check your inbox for the password reset link.',
    });
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
    toast({
      tone: 'success',
      title: 'Password updated',
      description: 'You can continue using your account securely.',
    });
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  };

  const switchTenant = async (tenantId: string) => {
    if (!isSuperAdmin || !isValidTenantId(tenantId, managedTenantIds)) {
      throw new Error('You do not have access to this tenant.');
    }

    setStoredTenantId(tenantId);
    setSchoolId(tenantId);
    toast({
      tone: 'success',
      title: 'Tenant switched',
      description: 'The active school context was updated.',
    });
  };

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

  const hasLibrarianRole = roles.includes(ROLES.LIBRARIAN);

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
    canManageLibrary: hasPermission(permissionUser, 'manageLibrary') || hasLibrarianRole,
    canManageFees: hasPermission(permissionUser, 'manageFees'),
    canManagePerformance:
      hasPermission(permissionUser, 'viewReports') || !!permissions.managePerformance,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshProfile,
    switchTenant,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
