import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
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

function toMobileUser(user: SupabaseUser, accessToken: string | null): MobileUser {
  return {
    uid: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name || user.email,
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
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const applySession = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setSchoolId(null);
      setRoles([]);
      setPermissions({});
      setLoading(false);
      return;
    }

    setUser(toMobileUser(session.user, session.access_token));

    try {
      const profile = await getProfile(session.user.id);
      const appMetadata = session.user.app_metadata || {};
      setSchoolId(profile.schoolId || appMetadata.schoolId || null);
      setRoles(profile.roles || appMetadata.roles || []);
      setPermissions(profile.permissions || appMetadata.permissions || {});
    } catch (error) {
      console.error('[Auth] Failed to fetch Supabase profile:', error);
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
          err
        );
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, schoolId, roles, permissions, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
