import React, { useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  Calendar,
  Filter,
  Megaphone,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';
import { useDebounce } from '../lib/hooks';
import { useDocuments } from '../lib/documents';
import { EmptyState } from '../components/saas/EmptyState';
import { LoadingSkeleton } from '../components/saas/LoadingSkeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { PageShell } from '../components/ui/PageShell';
import { useToast } from '../components/saas/ToastProvider';
import { cn } from '../lib/utils';

interface Announcement {
  id: string;
  title?: string;
  content?: string;
  authorId?: string;
  authorName?: string;
  targetClasses?: string[];
  targetRoles?: string[];
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  pinned?: boolean;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  scheduledFor?: string | null;
}

const priorities = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

export const AnnouncementsPage = () => {
  const { isAdmin, isTeacher, user, role, classIds } = useAuth();
  const { toast } = useToast();
  const [renderedAt] = useState(() => Date.now());
  const canPost = isAdmin || isTeacher || role === 'principal';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search, 250);
  const {
    data: records,
    loading,
    reload,
  } = useDocuments<Announcement>('announcements', {
    order: { field: 'createdAt', ascending: false },
    realtime: true,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const handleReload = useCallback(async () => {
    await reload();
    setLastSyncTime(new Date());
    toast({
      tone: 'success',
      title: 'Refreshed',
      description: 'Announcements synced successfully.',
    });
  }, [reload, toast]);

  const [form, setForm] = useState({
    title: '',
    content: '',
    targetClasses: 'all',
    targetRoles: 'all',
    category: 'general',
    priority: 'normal' as Announcement['priority'],
    pinned: false,
    isScheduled: false,
    scheduledFor: '',
  });

  const announcements = useMemo(() => {
    return records
      .filter((announcement) => announcement.status !== 'archived')
      .filter((announcement) => {
        const targetRoles = announcement.targetRoles || ['all'];
        const targetClasses = announcement.targetClasses || ['all'];
        const roleMatch = targetRoles.includes('all') || targetRoles.includes(role || 'student');
        const classMatch =
          targetClasses.includes('all') ||
          (classIds || []).some((classId) => targetClasses.includes(classId));
        const searchMatch = `${announcement.title || ''} ${announcement.content || ''}`
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase());
        const categoryMatch =
          categoryFilter === 'all' || (announcement.category || 'general') === categoryFilter;
        return roleMatch && classMatch && searchMatch && categoryMatch;
      })
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [categoryFilter, classIds, debouncedSearch, records, role]);

  const categories = Array.from(
    new Set(records.map((announcement) => announcement.category || 'general'))
  );

  const createAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.request('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          targetClasses: form.targetClasses
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          targetRoles: form.targetRoles
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          visibility: form.targetClasses.includes('all') ? 'school' : 'class',
          category: form.category,
          priority: form.priority,
          pinned: form.pinned,
          isScheduled: form.isScheduled,
          scheduledFor:
            form.isScheduled && form.scheduledFor
              ? new Date(form.scheduledFor).toISOString()
              : null,
        }),
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        content: '',
        targetClasses: 'all',
        targetRoles: 'all',
        category: 'general',
        priority: 'normal',
        pinned: false,
        isScheduled: false,
        scheduledFor: '',
      });
      // Refetch to ensure sync
      await reload();
      setLastSyncTime(new Date());
      toast({
        tone: 'success',
        title: 'Announcement posted',
        description: 'The update is now visible to the selected audience.',
      });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Announcement not posted',
        description: (error as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!window.confirm('Archive this announcement?')) return;
    try {
      await apiClient.request(`/api/announcements/${id}`, { method: 'DELETE' });
      // Refetch to ensure sync
      await reload();
      setLastSyncTime(new Date());
      toast({
        tone: 'success',
        title: 'Archived',
        description: 'Announcement archived successfully.',
      });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Archive failed',
        description: (error as Error).message,
      });
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="School Updates"
        description="Priority-aware broadcasts, role targeting, scheduling, and instant delivery for the whole school."
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleReload}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 p-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            title="Refresh announcements"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {canPost && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
            >
              <Plus size={20} />
              New Announcement
            </button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        {canPost && (
          <div className="lg:col-span-2 flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs font-bold text-blue-700">
              Last synced: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
            </p>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Realtime enabled
            </span>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search announcements..."
            className="h-14 w-full rounded-2xl border border-white bg-white/85 pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none ring-blue-100 transition focus:ring-4"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-14 w-full rounded-2xl border border-white bg-white/85 pl-11 pr-4 text-sm font-black text-slate-600 shadow-sm outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements found"
          description="Try changing filters, or create a new announcement for your audience."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {announcements.map((announcement, index) => (
              <motion.article
                key={announcement.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: Math.min(index * 0.03, 0.18) }}
                className={cn(
                  'group relative overflow-hidden rounded-[30px] border bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur',
                  announcement.pinned ? 'border-blue-200' : 'border-white/70'
                )}
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-blue-50 via-white to-transparent" />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {announcement.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <Pin size={11} />
                            Pinned
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
                            priorities[announcement.priority || 'normal']
                          )}
                        >
                          {announcement.priority || 'normal'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {announcement.category || 'general'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950 group-hover:text-blue-700">
                        {announcement.title || 'Untitled announcement'}
                      </h2>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                        {announcement.authorName || 'EduConnect'} •{' '}
                        {formatDistanceToNow(
                          new Date(announcement.createdAt || announcement.timestamp || renderedAt),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                    {(isAdmin || announcement.authorId === user?.uid) && (
                      <button
                        onClick={() => deleteAnnouncement(announcement.id)}
                        className="rounded-2xl bg-red-50 p-3 text-red-600 opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-slate-600">
                    {announcement.content || 'No details provided.'}
                  </p>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {(announcement.targetRoles || ['all']).map((target) => (
                      <span
                        key={target}
                        className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700"
                      >
                        {target}
                      </span>
                    ))}
                    {(announcement.targetClasses || ['all']).map((target) => (
                      <span
                        key={target}
                        className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"
                      >
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            <motion.form
              onSubmit={createAnnouncement}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[34px] bg-white p-6 shadow-2xl md:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-950">Create Announcement</h2>
                  <p className="text-sm font-medium text-slate-500">
                    Target the right audience with a polished update.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl bg-slate-100 p-3 text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Title
                  </span>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Content
                  </span>
                  <textarea
                    required
                    rows={7}
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold leading-7 outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <FormInput
                  label="Target classes"
                  value={form.targetClasses}
                  onChange={(value) => setForm({ ...form, targetClasses: value })}
                />
                <FormInput
                  label="Target roles"
                  value={form.targetRoles}
                  onChange={(value) => setForm({ ...form, targetRoles: value })}
                />
                <FormInput
                  label="Category"
                  value={form.category}
                  onChange={(value) => setForm({ ...form, category: value })}
                />
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Priority
                  </span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value as Announcement['priority'] })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4 md:grid-cols-2">
                <label className="flex items-center gap-3 text-sm font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
                  />
                  Pin announcement
                </label>
                <label className="flex items-center gap-3 text-sm font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isScheduled}
                    onChange={(event) => setForm({ ...form, isScheduled: event.target.checked })}
                  />
                  <Calendar size={16} />
                  Schedule
                </label>
                {form.isScheduled && (
                  <input
                    type="datetime-local"
                    value={form.scheduledFor}
                    onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none md:col-span-2"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl shadow-blue-100 disabled:opacity-60"
              >
                {submitting ? <Sparkles className="animate-pulse" size={18} /> : <Send size={18} />}
                {submitting ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

function FormInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
