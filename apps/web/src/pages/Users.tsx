import React, { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import { useDebounce } from '../lib/hooks';
import { listDocuments, useDocuments } from '../lib/documents';
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
}

interface AuditLogRecord {
  id?: string;
  action: string;
  targetUid?: string;
  performedBy?: string;
  details?: string;
  timestamp?: string;
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
};

const inputClass =
  'w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-700';

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
  };
}

export const UsersPage = ({ type }: { type: 'student' | 'teacher' | 'all' }) => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [moduleFilter, setModuleFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { data: allUsers, loading } = useDocuments<UserProfile>('users');

  const users = useMemo(() => {
    return allUsers.filter((profile) => {
      const role = getPrimaryRole(profile);
      const searchable =
        `${profile.displayName || ''} ${profile.email || ''} ${role}`.toLowerCase();
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

      return matchesType && matchesSearch && matchesRole && matchesStatus && matchesModule;
    });
  }, [allUsers, debouncedSearch, moduleFilter, roleFilter, statusFilter, type]);

  const openAddModal = () => {
    setForm(emptyForm);
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
        await apiClient.request(`/api/users/${form.uid}`, {
          method: 'PUT',
          body: JSON.stringify(buildPayload()),
        });
      } else {
        await apiClient.request('/api/users/create', {
          method: 'POST',
          body: JSON.stringify(buildPayload()),
        });
      }
      setIsUserModalOpen(false);
      toast({
        tone: 'success',
        title: form.uid ? 'User updated' : 'User created',
        description: `${form.displayName || form.email} is saved.`,
      });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'User save failed',
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (profile: UserProfile) => {
    const uid = profile.uid || profile.id;
    if (!uid || !isAdmin) return;
    if (!window.confirm(`Deactivate ${profile.email || 'this user'}?`)) return;

    try {
      await apiClient.request(`/api/users/${uid}/deactivate`, { method: 'PATCH' });
      toast({
        tone: 'success',
        title: 'User deactivated',
        description: `${profile.email || 'The user'} was marked inactive.`,
      });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Deactivate failed',
        description: (error as Error).message,
      });
    }
  };

  const bulkImport = async () => {
    if (!bulkText.trim()) return;

    const usersToImport = bulkText
      .trim()
      .split('\n')
      .map((line) => {
        const [email, displayName, role, password, classIds, subjectIds] = line
          .split(',')
          .map((item) => item.trim());
        return {
          email,
          displayName,
          role,
          password,
          classIds: classIds ? classIds.split(';').map((item) => item.trim()) : [],
          subjectIds: subjectIds ? subjectIds.split(';').map((item) => item.trim()) : [],
        };
      });

    try {
      const result = await apiClient.request<{ results: Array<{ success: boolean }> }>(
        '/api/users/bulk-import',
        {
          method: 'POST',
          body: JSON.stringify({ users: usersToImport }),
        }
      );
      toast({
        tone: 'success',
        title: 'Import complete',
        description: `Success: ${result.results.filter((item) => item.success).length}, Failed: ${
          result.results.filter((item) => !item.success).length
        }`,
      });
      setBulkText('');
      setIsBulkModalOpen(false);
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Import failed',
        description: (error as Error).message,
      });
    }
  };

  const openAuditLogs = async (targetUid?: string) => {
    setIsAuditModalOpen(true);
    try {
      const logs = await listDocuments<AuditLogRecord>('auditLogs', {
        filters: targetUid ? [{ field: 'targetUid', op: 'eq', value: targetUid }] : [],
        order: { field: 'timestamp', ascending: false },
        limit: 80,
      });
      setAuditLogs(logs);
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px_220px] gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        <select
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
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <UserIcon size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-black text-slate-900 truncate">
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
                  <p className="text-sm text-slate-500 truncate">{profile.email}</p>
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
                      onClick={() => deactivateUser(profile)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100"
                    >
                      Deactivate
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
          <Modal onClose={() => setIsBulkModalOpen(false)} title="Bulk Import Users">
            <div className="space-y-5">
              <textarea
                rows={8}
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                placeholder="email, name, role, password, 10A;10B, math;science"
                className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-mono text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={bulkImport}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Import
                </button>
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-8 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
              </div>
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
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
        <Icon size={12} />
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800 truncate mt-1">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
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
      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
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
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[100]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-[32px] shadow-2xl p-6 lg:p-8"
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
