import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCircle2, ExternalLink, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api-client';
import { cn } from '../../lib/utils';
import { useToast } from './ToastProvider';

interface NotificationRecord {
  id?: string;
  title?: string;
  message?: string;
  read?: boolean;
  readBy?: string[];
  href?: string | null;
  targetUserIds?: string[];
  targetRoles?: string[];
  targetClasses?: string[];
  schoolId?: string;
  type?: string;
  createdAt?: string;
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<NotificationRecord[]>('/api/notifications');
      setNotifications(data);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (mounted) await reload();
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [reload]);

  const isRead = (item: NotificationRecord) =>
    item.read || (user?.uid ? item.readBy?.includes(user.uid) : false);

  const unread = notifications.filter((item) => !isRead(item)).length;

  const markRead = async (item: NotificationRecord) => {
    if (!item.id || isRead(item) || !user?.uid) return;

    const original = [...notifications];
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === item.id
          ? { ...n, readBy: Array.from(new Set([...(n.readBy || []), user.uid])) }
          : n
      )
    );

    try {
      await apiClient.request(`/api/notifications/${item.id}/read`, { method: 'PATCH' });
    } catch (error) {
      setNotifications(original);
      toast({
        tone: 'error',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to mark notification read.',
      });
    }
  };

  const markAllRead = async () => {
    if (unread === 0 || !user?.uid) return;

    const original = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readBy: Array.from(new Set([...(n.readBy || []), user.uid])) }))
    );

    try {
      await apiClient.request('/api/notifications/read-all', { method: 'PATCH' });
      toast({
        tone: 'success',
        title: 'All read',
        description: 'Updates were marked as read.',
      });
    } catch (error) {
      setNotifications(original);
      toast({
        tone: 'error',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to mark all as read.',
      });
    }
  };

  const clearRead = async () => {
    const readCount = notifications.filter(isRead).length;
    if (readCount === 0) return;

    const original = [...notifications];
    setNotifications((prev) => prev.filter((n) => !isRead(n)));

    try {
      await apiClient.request('/api/notifications/read', { method: 'DELETE' });
      toast({
        tone: 'success',
        title: 'Cleared',
        description: 'Read notifications were removed from your view.',
      });
    } catch (error) {
      setNotifications(original);
      toast({
        tone: 'error',
        title: 'Clear failed',
        description: error instanceof Error ? error.message : 'Unable to clear read notifications.',
      });
    }
  };

  const openNotification = async (item: NotificationRecord) => {
    await markRead(item);
    if (item.href) {
      setOpen(false);
      navigate(item.href);
    }
  };

  const deleteNotification = async (item: NotificationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.id) return;

    const original = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));

    try {
      await apiClient.request(`/api/notifications/${item.id}`, { method: 'DELETE' });
      toast({
        tone: 'success',
        title: 'Deleted',
        description: 'Notification removed.',
      });
    } catch (error) {
      setNotifications(original);
      toast({
        tone: 'error',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete notification.',
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isInsideTrigger = dropdownRef.current?.contains(event.target as Node);
      const isInsideContent = contentRef.current?.contains(event.target as Node);

      if (!isInsideTrigger && !isInsideContent) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open]);

  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  const updatePosition = useCallback(() => {
    if (open && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 12,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [open, updatePosition]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open &&
          createPortal(
            <motion.div
              ref={contentRef}
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              style={{
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
                maxHeight: 'min(70vh, 480px)',
              }}
              className="fixed z-[9999] w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-[26px] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">Notifications</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {unread} unread updates
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void reload()}
                    disabled={loading}
                    className="rounded-xl bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400"
                    title="Refresh"
                  >
                    <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
                  </button>
                  <button
                    onClick={markAllRead}
                    className="rounded-xl bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                    title="Mark all read"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {loading && notifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-slate-500">Fetching updates...</p>
                  </div>
                )}

                {fetchError && notifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="mb-4 text-sm font-medium text-red-600">
                      Failed to load notifications
                    </p>
                    <button
                      onClick={() => void reload()}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!loading && !fetchError && notifications.length === 0 && !import.meta.env.DEV && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="mb-2 h-10 w-10 text-slate-200" />
                    <p className="text-sm font-medium text-slate-500">All caught up!</p>
                  </div>
                )}

                {!loading && !fetchError && notifications.length === 0 && import.meta.env.DEV && (
                  <div className="group relative rounded-2xl bg-blue-50/70 p-3 transition-colors hover:bg-slate-50 dark:bg-blue-950/30 dark:hover:bg-slate-900">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                      <div className="min-w-0 flex-1 pr-8">
                        <p className="truncate font-bold text-slate-900 dark:text-white">
                          Realtime center ready (Dev)
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                          Announcements, chat, and admin events can surface here.
                        </p>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Just now
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-900',
                      !isRead(item) && 'bg-blue-50/10 dark:bg-blue-950/20'
                    )}
                  >
                    <button
                      onClick={() => void openNotification(item)}
                      className="w-full p-3 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                            isRead(item) ? 'bg-slate-200 dark:bg-slate-700' : 'bg-blue-600'
                          )}
                        />
                        <div className="min-w-0 flex-1 pr-8">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-bold text-slate-900 dark:text-white">
                              {item.title || 'Notification'}
                            </p>
                            {item.href && (
                              <ExternalLink size={12} className="shrink-0 text-slate-300" />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                            {item.message}
                          </p>
                          {item.createdAt && (
                            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => void deleteNotification(item, e)}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/40"
                      title="Dismiss"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {notifications.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/50 shrink-0">
                  <button
                    onClick={clearRead}
                    className="flex w-full items-center justify-center rounded-xl py-2 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    Clear Read Notifications
                  </button>
                </div>
              )}
            </motion.div>,
            document.body
          )}
      </AnimatePresence>
    </div>
  );
}
