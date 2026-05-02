import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  role: string | null; // Keep for legacy, but use roles/permissions
  roles: string[];
  permissions: Record<string, boolean>;
  classId: string | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  canManageAttendance: boolean;
  canManageAssignments: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  roles: [],
  permissions: {},
  classId: null,
  loading: true,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  canManageAttendance: false,
  canManageAssignments: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [classId, setClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true); // Force refresh
          const claims = idTokenResult.claims as any;
          
          if (claims.roles) {
            setRoles(claims.roles);
            setPermissions(claims.permissions || {});
            setClassId(claims.classId || null);
          } else {
            // Fallback to Firestore if claims are missing (initial setup)
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setRoles(data.roles || []);
              setPermissions(data.permissions || {});
              setClassId(data.classId || null);
            }
          }
        } catch (error) {
          console.error("Error fetching credentials:", error);
        }
      } else {
        setRoles([]);
        setPermissions({});
        setClassId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    role: roles[0] || null,
    roles,
    permissions,
    classId,
    loading,
    isAdmin: !!permissions.manageStudents || !!permissions.financialOps,
    isTeacher: roles.includes('teacher'),
    isStudent: roles.includes('student'),
    canManageAttendance: !!permissions.manageAttendance,
    canManageAssignments: !!permissions.manageAssignments,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
