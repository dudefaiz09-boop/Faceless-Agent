import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  UserRole, 
  ROLES, 
  getUserRole, 
  COLLECTIONS 
} from '@educonnect/shared';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  roles: string[];
  permissions: Record<string, boolean>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [classId, setClassId] = useState<string | null>(null);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true); // Force refresh
          
          interface CustomClaims {
            roles?: string[];
            permissions?: Record<string, boolean>;
            classId?: string;
            linkedStudentIds?: string[];
          }
          
          const claims = idTokenResult.claims as CustomClaims;
          
          if (claims.roles) {
            setRoles(claims.roles);
            setPermissions(claims.permissions || {});
            setClassId(claims.classId || null);
            setLinkedStudentIds(claims.linkedStudentIds || []);
          } else {
            // Fallback to Firestore if claims are missing (initial setup)
            const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setRoles(data.roles || []);
              setPermissions(data.permissions || {});
              setClassId(data.classId || null);
              // Parents fetch their linked children by inverse lookup, but caching here is simpler if stored in custom claims.
              // For fallback, we will just set it if it exists.
              setLinkedStudentIds(data.linkedStudentIds || []); 
            }
          }
        } catch (error) {
          console.error("Error fetching credentials:", error);
        }
      } else {
        setRoles([]);
        setPermissions({});
        setClassId(null);
        setLinkedStudentIds([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    role: getUserRole(roles),
    roles,
    permissions,
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

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
