import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import {
  ROLES,
  getAuthErrorMessage,
  getUserRole,
  hasPermission,
  type Role,
} from '@educonnect/shared';
import { authProfileService, setMobileTenantId } from '../lib/api-client';
import { supabase } from '../lib/supabase';

interface MobileUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  getIdToken: () => Promise<string | null>;
}

interface AuthContextType {
  user: MobileUser | null;
  loading: boolean;
  schoolId: string | null;
  classId: string | null;
  classIds: string[];
  subjectIds: string[];
  sectionIds: string[];
  linkedStudentIds: string[];
  assignedModules: string[];
  managedTenantIds: string[];
  role: Role;
  roles: string[];
  permissions: Record<string, boolean>;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  isSuperAdmin: boolean;
  canManageAttendance: boolean;
  canManageAssignments: boolean;
  canManageLibrary: boolean;
  canManageFees: boolean;
  canManagePerformance: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (args: { displayName: string; email: string; password: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  schoolId: null,
  classId: null,
  classIds: [],
  subjectIds: [],
  sectionIds: [],
  linkedStudentIds: [],
  assignedModules: [],
  managedTenantIds: [],
  role: ROLES.STUDENT,
  roles: [],
  permissions: {},
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isParent: false,
  isSuperAdmin: false,
  canManageAttendance: false,
  canManageAssignments: false,
  canManageLibrary: false,
  canManageFees: false,
  canManagePerformance: false,
  login: async () => {},
  register: async () => {},
  sendPasswordReset: async () => {},
  updatePassword: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function toMobileUser(user: SupabaseUser, accessToken: string | null): MobileUser {
  return {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name || user.email,
    getIdToken: async () => accessToken,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [assignedModules, setAssignedModules] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [managedTenantIds, setManagedTenantIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const clearProfileState = () => {
    setSchoolId(null);
    setMobileTenantId(null);
    setClassId(null);
    setClassIds([]);
    setSubjectIds([]);
    setSectionIds([]);
    setLinkedStudentIds([]);
    setAssignedModules([]);
    setIsSuperAdmin(false);
    setManagedTenantIds([]);
    setRoles([]);
    setPermissions({});
  };

  const applySession = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      clearProfileState();
      setLoading(false);
      return;
    }

    setUser(toMobileUser(session.user, session.access_token));

    try {
      const profile = await authProfileService.getProfile();
      const appMetadata = session.user.app_metadata || {};

      if (profile.disabled || profile.status === 'disabled' || appMetadata.disabled === true) {
        await supabase.auth.signOut();
        setUser(null);
        clearProfileState();
        return;
      }

      const nextSchoolId =
        profile.schoolId ||
        profile.tenantId ||
        appMetadata.schoolId ||
        appMetadata.tenantId ||
        profile.defaultTenantId ||
        appMetadata.defaultTenantId ||
        null;
      const nextIsSuperAdmin =
        !!profile.is_super_admin || !!profile.isSuperAdmin || !!appMetadata.isSuperAdmin;
      const nextManagedTenantIds =
        profile.managed_tenant_ids ||
        profile.managedTenantIds ||
        appMetadata.managedTenantIds ||
        [];
      const nextRoles = profile.roles || appMetadata.roles || (profile.role ? [profile.role] : []);
      const nextClassId = profile.classId || appMetadata.classId || null;
      const nextClassIds =
        profile.classIds || appMetadata.classIds || (nextClassId ? [nextClassId] : []);
      setSchoolId(nextSchoolId);
      setMobileTenantId(nextSchoolId);
      setClassId(nextClassId);
      setClassIds(nextClassIds);
      setSubjectIds(profile.subjectIds || appMetadata.subjectIds || []);
      setSectionIds(profile.sectionIds || appMetadata.sectionIds || []);
      setLinkedStudentIds(profile.linkedStudentIds || appMetadata.linkedStudentIds || []);
      setAssignedModules(profile.assignedModules || appMetadata.assignedModules || []);
      setIsSuperAdmin(nextIsSuperAdmin);
      setManagedTenantIds(nextManagedTenantIds);
      setRoles(nextRoles);
      setPermissions(profile.permissions || appMetadata.permissions || {});
    } catch (error) {
      console.error('[Auth] Failed to fetch API profile:', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch((err) => {
        console.error(
          '[Auth] Initial session fetch failed (likely wrong API URL or offline):',
          (err as Error).message
        );
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
    // applySession is intentionally scoped to this provider's current state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(getAuthErrorMessage(error));
    if (!data.session) throw new Error('Sign in did not return a valid session. Please try again.');
  };

  const register = async ({
    displayName,
    email,
    password,
  }: {
    displayName: string;
    email: string;
    password: string;
  }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'educonnect://auth/callback',
        data: {
          display_name: displayName,
        },
      },
    });
    if (error) throw new Error(getAuthErrorMessage(error));
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'educonnect://auth/reset-password',
    });
    if (error) throw new Error(getAuthErrorMessage(error));
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(getAuthErrorMessage(error));
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const role = getUserRole(roles);
  const permissionUser = {
    roles: role ? [role] : [],
    isAdmin: roles.includes(ROLES.ADMIN) || isSuperAdmin,
    permissions,
  };
  const isAdmin = roles.includes(ROLES.ADMIN) || isSuperAdmin;
  const isTeacher = roles.includes(ROLES.TEACHER);
  const isStudent = roles.includes(ROLES.STUDENT);
  const isParent = roles.includes(ROLES.PARENT);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        schoolId,
        classId,
        classIds,
        subjectIds,
        sectionIds,
        linkedStudentIds,
        assignedModules,
        managedTenantIds,
        role,
        roles,
        permissions,
        isAdmin,
        isSuperAdmin,
        isTeacher,
        isStudent,
        isParent,
        canManageAttendance: hasPermission(permissionUser, 'markAttendance'),
        canManageAssignments: Boolean(permissions.manageAssignments || isTeacher || isAdmin),
        canManageLibrary: hasPermission(permissionUser, 'manageLibrary'),
        canManageFees: hasPermission(permissionUser, 'manageFees'),
        canManagePerformance: hasPermission(permissionUser, 'viewReports'),
        login,
        register,
        sendPasswordReset,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
