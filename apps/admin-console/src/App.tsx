import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  School,
  Users,
  Activity,
  LogOut,
  ShieldCheck,
  Plus,
  Check,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Building,
  Mail,
  Key,
  UserPlus,
  Server,
  Database,
  WifiOff,
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing in environment.');
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

type Tab = 'dashboard' | 'schools' | 'users';

interface SchoolData {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  roles?: string[];
  schoolId: string;
  tenantId?: string;
  status?: string;
  assignedModules?: string[];
}

export const AdminApp = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Data States
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Search & Filters
  const [schoolSearch, setSchoolSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Health Check State
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>(() =>
    apiBase ? 'checking' : 'error'
  );
  const [dbStatus, setDbStatus] = useState<'checking' | 'synced' | 'error'>(() =>
    apiBase ? 'checking' : 'error'
  );

  useEffect(() => {
    if (!apiBase) return;
    let cancelled = false;
    fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(5000) })
      .then((r) => {
        if (cancelled) return null;
        if (!r.ok) {
          setApiStatus('error');
          setDbStatus('error');
          return null;
        }
        setApiStatus('connected');
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setDbStatus(data.status === 'healthy' ? 'synced' : 'error');
      })
      .catch(() => {
        if (cancelled) return;
        setApiStatus('error');
        setDbStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  // School Onboarding Form State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newSchoolId, setNewSchoolId] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolSlug, setNewSchoolSlug] = useState('');

  // Admin Provisioning State
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [onboardSuccess, setOnboardSuccess] = useState(false);

  const validateSession = async (currentSession: any) => {
    if (!currentSession) {
      setSession(null);
      setLoading(false);
      return;
    }

    const appMetadata = currentSession.user?.app_metadata || {};
    const userId = currentSession.user?.id;

    try {
      // Validate Super Admin privileges
      const { data: profileDoc } = await supabase
        .from('documents')
        .select('data')
        .eq('collection', 'users')
        .eq('id', userId)
        .maybeSingle();

      const profile = profileDoc?.data || {};
      const isSuperAdmin =
        !!profile.isSuperAdmin || !!profile.is_super_admin || !!appMetadata.isSuperAdmin;

      if (!isSuperAdmin) {
        setAuthError('Access Denied: Only Global Super Administrators are authorized.');
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(currentSession);
        setAuthError('');
        setLoading(false);
        void loadData();
        return;
      }
    } catch (err) {
      console.error('Session validation error:', err);
      setSession(currentSession);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      validateSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      validateSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  async function loadData() {
    setDataLoading(true);
    try {
      const { data: docSchools, error: schoolErr } = await supabase
        .from('documents')
        .select('id, data')
        .eq('collection', 'schools');
      if (schoolErr) throw schoolErr;
      const loadedSchools = (docSchools || []).map((row) => ({
        id: row.id,
        name: String(row.data?.name || ''),
        slug: String(row.data?.slug || ''),
        status: (row.data?.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        createdAt: String(row.data?.createdAt || ''),
      }));
      setSchools(loadedSchools);

      const { data: docUsers, error: userErr } = await supabase
        .from('documents')
        .select('id, data')
        .eq('collection', 'users');
      if (userErr) throw userErr;
      const loadedUsers = (docUsers || []).map((row) => ({
        id: row.id,
        email: String(row.data?.email || ''),
        displayName: String(row.data?.displayName || ''),
        role: String(row.data?.role || ''),
        roles: Array.isArray(row.data?.roles) ? row.data.roles : [],
        schoolId: String(row.data?.schoolId || row.data?.tenantId || ''),
        status: String(row.data?.status || 'active'),
        assignedModules: Array.isArray(row.data?.assignedModules) ? row.data.assignedModules : [],
      }));
      setUsers(loadedUsers);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  const handleOnboardSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    setOnboardError('');
    setOnboardSuccess(false);

    try {
      // 1. Register tenant in legacy documents table
      const { error: docError } = await supabase.from('documents').insert({
        collection: 'schools',
        id: newSchoolId,
        data: {
          id: newSchoolId,
          name: newSchoolName,
          slug: newSchoolSlug,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      });

      if (docError) throw docError;

      // 2. Register tenant in public.tenants schema table
      const { error: tenantError } = await supabase.from('tenants').insert({
        id: newSchoolId,
        name: newSchoolName,
        slug: newSchoolSlug,
        status: 'active',
        metadata: {},
      });

      if (tenantError) {
        console.warn('Tenants table insert warning:', tenantError.message);
      }

      // 3. Provision the primary Admin user via the backend API
      const token = session.access_token;
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword,
          displayName: newAdminName,
          role: 'admin',
          schoolId: newSchoolId,
          permissions: {
            viewStudentDetails: true,
            manageAttendance: true,
            markAttendance: true,
            manageAssignments: true,
            manageLibrary: true,
            manageFees: true,
            managePerformance: true,
            viewReports: true,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Admin provisioning failed: ${body}`);
      }

      setOnboardSuccess(true);

      // Clear forms
      setNewSchoolId('');
      setNewSchoolName('');
      setNewSchoolSlug('');
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPassword('');

      // Refresh list
      await loadData();
    } catch (err: any) {
      setOnboardError(err.message || 'Onboarding failed.');
    } finally {
      setOnboardLoading(false);
    }
  };

  // Render Loading Spinner
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0f19] text-white">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-slate-400 font-medium">Validating security credentials...</p>
      </div>
    );
  }

  // Render Login Panel
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0f19] p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px]" />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4">
              <ShieldCheck className="text-blue-500" size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">Operator Console</h1>
            <p className="text-slate-400 text-sm text-center">
              EduConnect Global Administration Portal
            </p>
          </div>

          {authError && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-4 rounded-2xl mb-6">
              <AlertCircle className="shrink-0 text-red-400" size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Operator Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="email"
                  required
                  placeholder="admin@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-white text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Secure Password
              </label>
              <div className="relative">
                <Key
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-white text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {authLoading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In to Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter Logic
  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesSchool = selectedSchoolFilter === 'all' || u.schoolId === selectedSchoolFilter;
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchesSearch && matchesSchool && matchesRole;
  });

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-white">
      {/* Side Navigation Bar */}
      <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-display font-black text-sm tracking-tight text-white leading-none">
                EduConnect
              </h2>
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-500">
                Operator
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Activity size={18} />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('schools')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'schools'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <School size={18} />
              Schools & Tenants
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users size={18} />
              Cross-Tenant Users
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-2xl text-sm font-bold transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 overflow-y-auto p-10 relative">
        {/* Header bar */}
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white capitalize">
              {activeTab}
            </h1>
            <p className="text-slate-400 text-xs mt-1">Platform administration control plane</p>
          </div>
          <div className="flex items-center gap-4">
            {/* System Status badges */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-bold shadow-sm ${
                apiStatus === 'connected'
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : apiStatus === 'checking'
                    ? 'bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-red-950/40 border-red-900 text-red-400'
              }`}
            >
              {apiStatus === 'connected' ? (
                <Server size={14} className="text-emerald-500" />
              ) : apiStatus === 'checking' ? (
                <Loader2 size={14} className="text-slate-500 animate-spin" />
              ) : (
                <WifiOff size={14} className="text-red-500" />
              )}
              {apiStatus === 'connected'
                ? 'API Connected'
                : apiStatus === 'checking'
                  ? 'Checking...'
                  : 'API Offline'}
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-bold shadow-sm ${
                dbStatus === 'synced'
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : dbStatus === 'checking'
                    ? 'bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-red-950/40 border-red-900 text-red-400'
              }`}
            >
              {dbStatus === 'synced' ? (
                <Database size={14} className="text-emerald-500" />
              ) : dbStatus === 'checking' ? (
                <Loader2 size={14} className="text-slate-500 animate-spin" />
              ) : (
                <WifiOff size={14} className="text-red-500" />
              )}
              {dbStatus === 'synced'
                ? 'DB Synced'
                : dbStatus === 'checking'
                  ? 'Checking...'
                  : 'DB Error'}
            </div>
          </div>
        </header>

        {/* Tab content rendering */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-sm">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-2xl w-fit mb-4">
                  <School size={20} />
                </div>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Onboarded Schools
                </h3>
                <p className="text-3xl font-black text-white mt-2">{schools.length}</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-sm">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-2xl w-fit mb-4">
                  <Users size={20} />
                </div>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Cross-Tenant Users
                </h3>
                <p className="text-3xl font-black text-white mt-2">{users.length}</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-sm">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl w-fit mb-4">
                  <Activity size={20} />
                </div>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  System Status
                </h3>
                <p
                  className={`text-3xl font-black mt-2 ${
                    apiStatus === 'connected' && dbStatus === 'synced'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {apiStatus === 'connected' && dbStatus === 'synced' ? 'Optimal' : 'Degraded'}
                </p>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-sm">
              <h2 className="text-lg font-black text-white mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setActiveTab('schools');
                    setShowOnboardModal(true);
                  }}
                  className="flex items-center gap-3 p-4 bg-slate-950/40 hover:bg-blue-600 border border-slate-800/80 hover:border-blue-500 rounded-2xl text-sm font-bold text-left group transition-all"
                >
                  <Plus className="text-blue-500 group-hover:text-white" size={20} />
                  <div>
                    <p className="text-white">Onboard New School</p>
                    <span className="text-[10px] text-slate-400 group-hover:text-blue-200">
                      Register tenant & admin
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="flex items-center gap-3 p-4 bg-slate-950/40 hover:bg-blue-600 border border-slate-800/80 hover:border-blue-500 rounded-2xl text-sm font-bold text-left group transition-all"
                >
                  <Users className="text-blue-500 group-hover:text-white" size={20} />
                  <div>
                    <p className="text-white">Manage Users</p>
                    <span className="text-[10px] text-slate-400 group-hover:text-blue-200">
                      View user directory
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schools' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
              <div className="relative max-w-sm flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search schools..."
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm transition-all focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setShowOnboardModal(true);
                  setOnboardSuccess(false);
                  setOnboardError('');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                Onboard School
              </button>
            </div>

            {dataLoading ? (
              <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchools.map((school) => (
                  <div
                    key={school.id}
                    className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between shadow-sm relative overflow-hidden"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl">
                          <Building size={20} />
                        </div>
                        <span
                          className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                            school.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {school.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white">{school.name}</h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Tenant ID: <span className="font-mono text-blue-400">{school.id}</span>
                      </p>
                      <p className="text-slate-500 text-xs">Slug: {school.slug}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                      <span className="text-slate-400">
                        Users: {users.filter((u) => u.schoolId === school.id).length}
                      </span>
                      <span className="text-slate-500">
                        {school.createdAt ? new Date(school.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* School Onboarding Overlay Form */}
            {showOnboardModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-8 py-5 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-black text-white">Onboard New School Tenant</h3>
                    <button
                      onClick={() => setShowOnboardModal(false)}
                      className="text-slate-400 hover:text-white font-bold text-sm"
                    >
                      Close
                    </button>
                  </div>

                  <form onSubmit={handleOnboardSchool} className="p-8 space-y-6">
                    {onboardError && (
                      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-4 rounded-2xl">
                        <AlertCircle className="shrink-0 text-red-400" size={16} />
                        <span>{onboardError}</span>
                      </div>
                    )}

                    {onboardSuccess ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-2xl text-center">
                        <Check size={32} className="text-emerald-400 mb-2" />
                        <h4 className="font-bold text-white">Onboarding Complete!</h4>
                        <p className="text-xs mt-1">
                          Tenant school created and admin user provisioned successfully.
                        </p>
                        <button
                          type="button"
                          onClick={() => setOnboardSuccess(false)}
                          className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                        >
                          Onboard Another School
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                              School ID
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="your-school-id"
                              value={newSchoolId}
                              onChange={(e) => setNewSchoolId(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                              School Name
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Your School Name"
                              value={newSchoolName}
                              onChange={(e) => setNewSchoolName(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                            School Slug
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="your-school-slug"
                            value={newSchoolSlug}
                            onChange={(e) => setNewSchoolSlug(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-white"
                          />
                        </div>

                        <div className="border-t border-slate-800 pt-6">
                          <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                            <UserPlus size={16} className="text-blue-500" />
                            Primary Admin Credentials
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                                Admin Full Name
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Admin Full Name"
                                value={newAdminName}
                                onChange={(e) => setNewAdminName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                                Admin Email
                              </label>
                              <input
                                type="email"
                                required
                                placeholder="admin@school.com"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-white"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                              Temporary Password
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={newAdminPassword}
                              onChange={(e) => setNewAdminPassword(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-sm text-white"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={onboardLoading}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {onboardLoading ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            'Onboard School & Deploy Admin'
                          )}
                        </button>
                      </>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search user profile..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm transition-all"
                />
              </div>

              <div className="flex gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1">
                  <Building size={14} className="text-slate-500" />
                  <select
                    value={selectedSchoolFilter}
                    onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold text-slate-300 focus:ring-0 cursor-pointer"
                  >
                    <option value="all">All Schools</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1">
                  <Filter size={14} className="text-slate-500" />
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold text-slate-300 focus:ring-0 cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
              </div>
            </div>

            {dataLoading ? (
              <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-white text-base leading-tight">
                          {user.displayName || 'No Name'}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {user.role}
                      </span>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">School ID:</span>
                        <span className="font-bold text-slate-300 font-mono">
                          {user.schoolId || 'N/A'}
                        </span>
                      </div>
                      {(user.assignedModules || []).length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-slate-500">Modules:</span>
                          <div className="flex flex-wrap gap-1">
                            {(user.assignedModules || []).map((mod) => (
                              <span
                                key={mod}
                                className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] font-medium text-slate-300"
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
