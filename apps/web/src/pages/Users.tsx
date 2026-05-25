import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ALL_MODULES,
  ALL_PERMISSIONS,
  ALL_ROLES,
  MODULE_LABELS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type ModuleKey,
  type PermissionKey,
  type Role,
} from '@educonnect/shared';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Filter,
  History,
  Layers3,
  Plus,
  Save,
  Shield,
  Upload,
  User as UserIcon,
  X,
  Download,
  AlertCircle,
  School,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../lib/api-client';
import { useDebounce } from '../lib/hooks';
import { getStoredTenantId, setStoredTenantId } from '../lib/tenant';
import { cn } from '../lib/utils';
import { SearchBar } from '../components/saas/SearchBar';
import { StatCard } from '../components/saas/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useToast } from '../components/saas/ToastProvider';

type UserStatus = 'active' | 'inactive';

interface UserProfile {
  id?: string;
  uid?: string;
  displayName?: string;
  email?: string;
  role?: Role;
  roles?: string[];
  status?: UserStatus;
  assignedModules?: string[];
  permissions?: Record<string, boolean>;
  classIds?: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds?: string[];
  updatedAt?: string;
  schoolId?: string;
  tenantId?: string;
  managedTenantIds?: string[];
}

interface AuditLogRecord {
  id?: string;
  action: string;
  targetUid?: string;
  performedBy?: string;
  details?: string;
  timestamp?: string;
}

interface Tenant {
  id: string;
  name: string;
}

const emptyForm = {
  uid: '',
  email: '',
  password: '',
  displayName: '',
  role: 'student' as Role,
  status: 'active' as UserStatus,
  assignedModules: [] as string[],
  permissions: [] as string[],
  classIds: '',
  subjectIds: '',
  sectionIds: '',
  linkedStudentIds: '',
  phone: '',
  admissionNumber: '',
  employeeId: '',
  tenantId: '',
};

const inputClass =
  'w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-700 placeholder:text-slate-400 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-400/20';

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(values?: string[], fallback = 'None') {
  if (!values || values.length === 0) return fallback;
  return values.slice(0, 3).join(', ') + (values.length > 3 ? ` +${values.length - 3}` : '');
}

function getPrimaryRole(profile: UserProfile): Role {
  const role = profile.role || profile.roles?.[0];
  return ALL_ROLES.includes(role as Role) ? (role as Role) : 'student';
}

function toForm(profile: UserProfile) {
  const role = getPrimaryRole(profile);
  return {
    ...emptyForm,
    uid: profile.uid || profile.id || '',
    email: profile.email || '',
    displayName: profile.displayName || '',
    role,
    status: profile.status || 'active',
    assignedModules: profile.assignedModules || [],
    permissions: Object.entries(profile.permissions || {})
      .filter(([, enabled]) => enabled)
      .map(([permission]) => permission),
    classIds: (profile.classIds || []).join(', '),
    subjectIds: (profile.subjectIds || []).join(', '),
    sectionIds: (profile.sectionIds || []).join(', '),
    linkedStudentIds: (profile.linkedStudentIds || []).join(', '),
    tenantId: profile.schoolId || '',
  };
}

function createIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export const UsersPage = ({ type }: { type: 'student' | 'teacher' | 'all' }) => {
  const { isAdmin, isSuperAdmin, managedTenantIds, schoolId } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [moduleFilter, setModuleFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const debouncedSearch = useDebounce(search, 300);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [targetTenantId, setTargetTenantId] = useState(() => getStoredTenantId() || schoolId || '');
  const [selectedTenantId, setSelectedTenantId] = useState(
    () => getStoredTenantId() || schoolId || ''
  );

  useEffect(() => {
    if (isSuperAdmin && managedTenantIds.length > 0) {
      usersService
        .listTenants()
        .then((records) => setTenants(Array.isArray(records) ? records : []))
        .catch(() => setTenants([]));
    }
  }, [isSuperAdmin, managedTenantIds]);

  const tenantOptions = useMemo(() => {
    const tenantById = new Map<string, Tenant>();
    tenants.forEach((tenant) => tenantById.set(tenant.id, tenant));

    const allowedIds =
      isSuperAdmin && managedTenantIds.length > 0 ? managedTenantIds : schoolId ? [schoolId] : [];

    return allowedIds.map(
      (id) => tenantById.get(id) || { id, name: id.replaceAll('-', ' '), slug: id }
    );
  }, [isSuperAdmin, managedTenantIds, schoolId, tenants]);

  const activeTenantId = useMemo(() => {
    const allowedIds = tenantOptions.map((tenant) => tenant.id);
    if (selectedTenantId && allowedIds.includes(selectedTenantId)) return selectedTenantId;
    const stored = getStoredTenantId(allowedIds);
    return stored || schoolId || allowedIds[0] || '';
  }, [schoolId, selectedTenantId, tenantOptions]);

  const bulkTargetTenantId = useMemo(() => {
    const allowedIds = tenantOptions.map((tenant) => tenant.id);
    return targetTenantId && allowedIds.includes(targetTenantId) ? targetTenantId : activeTenantId;
  }, [activeTenantId, targetTenantId, tenantOptions]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const records = (await usersService.list({
        tenantId: activeTenantId || undefined,
        limit: 500,
      })) as UserProfile[];

      setAllUsers(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        tone: 'error',
        title: 'Users unavailable',
        description: error instanceof Error ? error.message : 'Unable to load user records.',
      });
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, toast]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void reload();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleTenantChange = (tenantId: string) => {
    if (!tenantOptions.some((tenant) => tenant.id === tenantId)) return;
    setStoredTenantId(tenantId);
    setSelectedTenantId(tenantId);
    setTargetTenantId(tenantId);
    setRoleFilter('all');
    setStatusFilter('all');
    setModuleFilter('');
  };

  const users = useMemo(() => {
    return allUsers.filter((profile) => {
      const role = getPrimaryRole(profile);
      const searchable =
        `${profile.displayName || ''} ${profile.email || ''} ${role}`.toLowerCase();
      const profileTenantId = profile.tenantId || profile.schoolId;
      const matchesTenant =
        !activeTenantId ||
        profileTenantId === activeTenantId ||
        profile.managedTenantIds?.includes(activeTenantId);
      const matchesType = type === 'all' || role === type;
      const matchesSearch = searchable.includes(debouncedSearch.toLowerCase());
      const matchesRole = roleFilter === 'all' || role === roleFilter;
      const status = profile.status || 'active';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesModule =
        !moduleFilter ||
        profile.assignedModules?.some((module) =>
          MODULE_LABELS[module as ModuleKey]?.toLowerCase().includes(moduleFilter.toLowerCase())
        );

      return (
        matchesTenant &&
        matchesType &&
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesModule
      );
    });
  }, [activeTenantId, allUsers, debouncedSearch, moduleFilter, roleFilter, statusFilter, type]);

  const openAddModal = () => {
    setForm({ ...emptyForm, tenantId: activeTenantId || schoolId || '' });
    setIsUserModalOpen(true);
  };

  const openEditModal = (profile: UserProfile) => {
    setForm(toForm(profile));
    setIsUserModalOpen(true);
  };

  const toggleArrayValue = (key: 'assignedModules' | 'permissions', value: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  const buildPayload = () => ({
    email: form.email,
    password: form.password || undefined,
    displayName: form.displayName,
    role: form.role,
    roles: [form.role],
    status: form.status,
    assignedModules: form.assignedModules,
    permissions: form.permissions.reduce<Record<string, boolean>>((acc, permission) => {
      acc[permission] = true;
      return acc;
    }, {}),
    classIds: splitCsv(form.classIds),
    subjectIds: splitCsv(form.subjectIds),
    sectionIds: splitCsv(form.sectionIds),
    linkedStudentIds: splitCsv(form.linkedStudentIds),
    tenantId: form.tenantId || undefined,
    phone: form.phone || undefined,
    admissionNumber: form.admissionNumber || undefined,
    employeeId: form.employeeId || undefined,
  });

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    try {
      if (form.uid) {
        await usersService.update(form.uid, buildPayload());
      } else {
        await usersService.create(buildPayload(), createIdempotencyKey('user-create'));
      }
      setIsUserModalOpen(false);
      await reload();
      toast({
        tone: 'success',
        title: isAdmin ? 'User saved' : 'Request sent',
        description: `${form.displayName || form.email} has been updated.`,
      });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Save failed',
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const requestUserDelete = async (profile: UserProfile) => {
    const uid = profile.uid || profile.id;
    if (!uid || !isAdmin) return;
    if (
      !window.confirm(
        `Request deletion for ${profile.email || 'this user'}? This deactivates the account.`
      )
    )
      return;

    try {
      await usersService.delete(uid);
      await reload();
      toast({
        tone: 'success',
        title: 'Delete requested',
        description: `${profile.email || 'The user'} was deactivated and logged for review.`,
      });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Delete request failed',
        description: (error as Error).message,
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim());

      const parsed = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = values[i];
        });
        return obj;
      });
      setImportPreview(parsed);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers =
      'email,role,password,permissions,classId,classIds,linkedStudentIds,tenantId,displayName';
    const sampleTenantId = bulkTargetTenantId || 'YOUR_TENANT_ID';
    const row = `student.import@school.test,student,YourPassword123!,"viewOwnRecords,viewAssignments",A1,"A1,A2",,${sampleTenantId},Imported Student 1`;
    const blob = new Blob([`${headers}\n${row}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'educonnect_user_import_template.csv';
    a.click();
  };

  const executeBulkImport = async () => {
    if (importPreview.length === 0) return;

    setSaving(true);
    try {
      const usersToImport = importPreview.map((u) => ({
        ...u,
        permissions: u.permissions ? u.permissions.split(',').map((s: string) => s.trim()) : [],
        classIds: u.classIds
          ? u.classIds.split(',').map((s: string) => s.trim())
          : u.classId
            ? [u.classId]
            : [],
        linkedStudentIds: u.linkedStudentIds
          ? u.linkedStudentIds.split(',').map((s: string) => s.trim())
          : [],
        tenantId: u.tenantId || bulkTargetTenantId,
      }));

      const result = (await usersService.bulkImport(
        usersToImport,
        createIdempotencyKey('users-import')
      )) as { results: Array<{ success: boolean }> };

      const successCount = result.results.filter((r) => r.success).length;
      toast({
        tone: successCount === usersToImport.length ? 'success' : 'warning',
        title: 'Import complete',
        description: `Successfully imported ${successCount} of ${usersToImport.length} users.`,
      });
      setIsBulkModalOpen(false);
      setImportPreview([]);
      await reload();
    } catch (error) {
      toast({ tone: 'error', title: 'Import failed', description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const openAuditLogs = async (targetUid?: string) => {
    setIsAuditModalOpen(true);
    try {
      const logs = (await usersService.listAuditLogs({
        targetUid,
        limit: 80,
      })) as AuditLogRecord[];

      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast({
        tone: 'error',
        title: 'Audit logs unavailable',
        description: 'Unable to load activity history right now.',
      });
      setAuditLogs([]);
    }
  };

  const activeCount = users.filter((profile) => (profile.status || 'active') === 'active').length;
  const roleCount = new Set(users.map((profile) => getPrimaryRole(profile))).size;
  const moduleAssignedCount = users.filter(
    (profile) => (profile.assignedModules || []).length > 0
  ).length;

  return (
    <PageShell>
      <PageHeader
        title="User & Role Management"
        description="Create accounts, assign roles, control module access, and review admin activity."
      >
        <div className="flex flex-col items-end gap-3">
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openAddModal}
                className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"
              >
                <Plus size={18} />
                Add User
              </button>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <Upload size={18} />
                Bulk Import
              </button>
              <button
                onClick={() => openAuditLogs()}
                className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <History size={18} />
                Audit Logs
              </button>
            </div>
          )}
          {!isAdmin && (
            <p className="text-sm font-semibold text-amber-700 bg-amber-50 rounded-2xl px-4 py-2 inline-flex border border-amber-100">
              Read-only view
            </p>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Visible Users"
          value={String(users.length)}
          detail="After filters"
          icon={UserIcon}
          tone="blue"
        />
        <StatCard
          title="Active"
          value={String(activeCount)}
          detail="Ready to sign in"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          title="Module Assigned"
          value={String(moduleAssignedCount)}
          detail={`${roleCount} roles represented`}
          icon={Layers3}
          tone="violet"
        />
      </div>

      {type === 'all' && isAdmin && tenantOptions.length > 1 && (
        <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-950">
                <School size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-cyan-300">
                  Active tenant
                </p>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  User lists, role filters, and stats are scoped to this tenant.
                </p>
              </div>
            </div>
            <select
              aria-label="Select active tenant"
              value={activeTenantId}
              onChange={(event) => handleTenantChange(event.target.value)}
              className="min-w-[220px] rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm outline-none transition focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
            >
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px_220px] gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        <select
          aria-label="Filter users by role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)}
          className="bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 outline-none"
        >
          <option value="all">All roles</option>
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter users by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | UserStatus)}
          className="bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 outline-none"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            aria-label="Filter users by module"
            placeholder="Filter module..."
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        {users.map((profile) => {
          const uid = profile.uid || profile.id || '';
          const role = getPrimaryRole(profile);
          const status = profile.status || 'active';

          return (
            <motion.div
              key={uid}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <UserIcon size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-black text-slate-900 truncate dark:text-slate-100">
                      {profile.displayName || 'Unnamed User'}
                    </h2>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-widest font-black rounded-full px-2 py-1',
                        status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate dark:text-slate-400">
                    {profile.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-sm">
                <Info icon={Shield} label="Role" value={ROLE_LABELS[role]} />
                <Info icon={Layers3} label="Modules" value={formatList(profile.assignedModules)} />
                <Info icon={BookOpen} label="Classes" value={formatList(profile.classIds)} />
                <Info
                  icon={ClipboardList}
                  label="Subjects"
                  value={formatList(profile.subjectIds)}
                />
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEditModal(profile)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => requestUserDelete(profile)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100"
                    >
                      Delete Request
                    </button>
                  </>
                )}
                <button
                  onClick={() => openAuditLogs(uid)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200"
                >
                  History
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <AnimatePresence>
        {isUserModalOpen && (
          <Modal
            onClose={() => setIsUserModalOpen(false)}
            title={form.uid ? 'Manage User' : 'Add User'}
          >
            <form onSubmit={saveUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full name">
                  <input
                    required
                    value={form.displayName}
                    onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    disabled={!!form.uid}
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className={cn(inputClass, 'disabled:bg-slate-100')}
                  />
                </Field>
                {!form.uid && (
                  <Field label="Password">
                    <input
                      required
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                )}
                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                    className={inputClass}
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value as UserStatus })
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
                {isSuperAdmin && (
                  <Field label="Target School">
                    <select
                      value={form.tenantId}
                      onChange={(event) => setForm({ ...form, tenantId: event.target.value })}
                      className={inputClass}
                    >
                      {tenantOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Class IDs">
                  <input
                    value={form.classIds}
                    onChange={(event) => setForm({ ...form, classIds: event.target.value })}
                    placeholder="10A, 10B"
                    className={inputClass}
                  />
                </Field>
                <Field label="Section IDs">
                  <input
                    value={form.sectionIds}
                    onChange={(event) => setForm({ ...form, sectionIds: event.target.value })}
                    placeholder="A, B"
                    className={inputClass}
                  />
                </Field>
                <Field label="Subject IDs">
                  <input
                    value={form.subjectIds}
                    onChange={(event) => setForm({ ...form, subjectIds: event.target.value })}
                    placeholder="math, science"
                    className={inputClass}
                  />
                </Field>
                <Field label="Linked student IDs">
                  <input
                    value={form.linkedStudentIds}
                    onChange={(event) => setForm({ ...form, linkedStudentIds: event.target.value })}
                    placeholder="student uid 1, student uid 2"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Checklist
                title="Module Access"
                items={ALL_MODULES.map((module) => ({
                  key: module,
                  label: MODULE_LABELS[module],
                }))}
                selected={form.assignedModules}
                onToggle={(value) => toggleArrayValue('assignedModules', value)}
              />

              <Checklist
                title="Permissions"
                items={ALL_PERMISSIONS.map((permission) => ({
                  key: permission,
                  label: PERMISSION_LABELS[permission as PermissionKey],
                }))}
                selected={form.permissions}
                onToggle={(value) => toggleArrayValue('permissions', value)}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-8 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isBulkModalOpen && (
          <Modal onClose={() => setIsBulkModalOpen(false)} title="Enterprise Bulk Import">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Download size={20} className="text-blue-600" />
                    1. Get Template
                  </h3>
                  <p className="text-sm text-slate-500">
                    Use our standard CSV structure to ensure your data is imported correctly.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Download CSV Template
                  </button>
                </div>

                <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Upload size={20} className="text-blue-600" />
                    2. Upload File
                  </h3>
                  <p className="text-sm text-slate-500">
                    Select your completed CSV file. Max size 5MB.
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                  >
                    Select CSV File
                  </button>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
                  <School size={20} className="text-slate-400" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Default Target School
                    </p>
                    <select
                      value={bulkTargetTenantId}
                      onChange={(e) => setTargetTenantId(e.target.value)}
                      className="bg-transparent font-bold text-slate-700 outline-none w-full"
                    >
                      {tenantOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {importPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">
                      Preview ({importPreview.length} rows detected)
                    </h3>
                    <button
                      onClick={() => setImportPreview([])}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-3 font-black text-slate-400 uppercase text-[10px]">
                            Email
                          </th>
                          <th className="p-3 font-black text-slate-400 uppercase text-[10px]">
                            Name
                          </th>
                          <th className="p-3 font-black text-slate-400 uppercase text-[10px]">
                            Role
                          </th>
                          <th className="p-3 font-black text-slate-400 uppercase text-[10px]">
                            School
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="p-3 font-semibold text-slate-700">{row.email}</td>
                            <td className="p-3 text-slate-600">{row.displayName}</td>
                            <td className="p-3">
                              <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                {row.role}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-xs">
                              {row.tenantId || bulkTargetTenantId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 5 && (
                      <div className="p-3 bg-slate-50 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        And {importPreview.length - 5} more rows...
                      </div>
                    )}
                  </div>
                  <div className="flex p-4 bg-amber-50 border border-amber-100 rounded-2xl gap-3">
                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs font-medium text-amber-700">
                      Ensure passwords meet complexity requirements. Existing users with the same
                      email will be updated if the backend logic allows.
                    </p>
                  </div>
                  <button
                    onClick={executeBulkImport}
                    disabled={saving}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Processing Import...' : 'Confirm and Execute Import'}
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}

        {isAuditModalOpen && (
          <Modal onClose={() => setIsAuditModalOpen(false)} title="Audit Logs">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id || `${log.action}-${log.timestamp}`}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                      {log.action?.replaceAll('_', ' ')}
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{log.details}</p>
                  <p className="mt-2 text-xs text-slate-400">By {log.performedBy || 'system'}</p>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-16">
                  <Archive className="mx-auto text-slate-300 mb-4" size={40} />
                  <p className="text-slate-400 font-bold">No audit logs found.</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 min-w-0 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 dark:text-slate-500">
        <Icon size={12} />
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800 truncate mt-1 dark:text-slate-200">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 min-w-0">
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest dark:text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Checklist({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Array<{ key: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 dark:text-slate-100">
        <CheckCircle2 size={16} className="text-blue-600" />
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key)}
            className={cn(
              'text-left px-3 py-2 rounded-xl border text-sm font-bold transition-all',
              selected.includes(item.key)
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-management-modal-title"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative my-6 w-full max-w-4xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[28px] border border-white/80 bg-white p-5 shadow-2xl sm:p-6 lg:p-8 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2
            id="user-management-modal-title"
            className="text-2xl font-black text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/50"
            aria-label="Close modal"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
