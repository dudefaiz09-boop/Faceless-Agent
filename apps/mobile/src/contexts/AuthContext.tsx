import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  schoolId: string | null;
  roles: string[];
  permissions: Record<string, boolean>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  schoolId: null,
  roles: [],
  permissions: {},
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const idTokenResult = await u.getIdTokenResult(true);
          const claims = idTokenResult.claims as any;
          setSchoolId(claims.schoolId || null);
          setRoles(claims.roles || []);
          setPermissions(claims.permissions || {});
        } catch (error) {
          console.error('[Auth] Failed to fetch custom claims:', error);
        }
      } else {
        setSchoolId(null);
        setRoles([]);
        setPermissions({});
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, schoolId, roles, permissions, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
