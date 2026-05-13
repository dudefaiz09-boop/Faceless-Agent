import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole, ROLES, getUserRole } from '@educonnect/shared';
import { supabase } from '../lib/supabase';

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
  linkedStudentIds: string[];
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
  canManageAttendance: boolean;
  canManageAssignments: boolean;
  canManageLibrary: boolean;
  canManageFees: boolean;
  canManagePerformance: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  roles: [],
  permissions: {},
  schoolId: null,
  classId: null,
  linkedStudentIds: [],
  loading: true,
  isAdmin: false,
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
  return (data?.data || {}) as Record<string, any>;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setRoles([]);
      setPermissions({});
      setSchoolId(null);
      setClassId(null);
      setLinkedStudentIds([]);
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
      const nextRoles = profile.roles || appMetadata.roles || [];
      const nextPermissions = profile.permissions || appMetadata.permissions || {};
      const nextSchoolId = profile.schoolId || appMetadata.schoolId || null;

      setRoles(nextRoles);
      setPermissions(nextPermissions);
      setSchoolId(nextSchoolId);
      setClassId(profile.classId || appMetadata.classId || null);
      setLinkedStudentIds(profile.linkedStudentIds || appMetadata.linkedStudentIds || []);

      if (nextSchoolId) {
        localStorage.setItem('educonnect_school_id', nextSchoolId);
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

  const value = {
    user,
    role: getUserRole(roles),
    roles,
    permissions,
    schoolId,
    classId,
    linkedStudentIds,
    loading,
    isAdmin: roles.includes(ROLES.ADMIN),
    isTeacher: roles.includes(ROLES.TEACHER),
    isStudent: roles.includes(ROLES.STUDENT),
    isParent: roles.includes(ROLES.PARENT),
    canManageAttendance: !!permissions.manageAttendance,
    canManageAssignments: !!permissions.manageAssignments,
    canManageLibrary: !!permissions.manageLibrary,
    canManageFees: !!permissions.manageFees,
    canManagePerformance: !!permissions.managePerformance,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
