import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Loader2,
  RefreshCw,
  X as CloseIcon,
} from 'lucide-react';
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
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    right: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<NotificationRecord[]>('/api/notifications');
      setNotifications(Array.isArray(data) ? data : []);
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

  const calculatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const width = Math.min(400, window.innerWidth - 32);
    const right = Math.max(16, window.innerWidth - rect.right);
    const top = rect.bottom + 12;

    return { top, right, width };
  }, []);

  const handleToggle = () => {
    const nextOpen = !open;
    if (nextOpen) {
      const position = calculatePosition();
      if (position) setDropdownPosition(position);
    }
    setOpen(nextOpen);
  };

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
      prev.map((n) => ({
        ...n,
        readBy: Array.from(new Set([...(n.readBy || []), user.uid])),
      }))
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
        title: 'History cleared',
        description: 'Read notifications were removed from your list.',
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

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const position = calculatePosition();
      if (position) setDropdownPosition(position);
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, calculatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isTriggerClick = triggerRef.current?.contains(target);
      const isContentClick = contentRef.current?.contains(target);

      if (!isTriggerClick && !isContentClick) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <motion.div layout className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open &&
        dropdownPosition &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={contentRef}
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                right: dropdownPosition.right,
                width: dropdownPosition.width,
                zIndex: 300,
              }}
              className="overflow-hidden rounded-[26px] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
            >
              <motion.div
                layout
                className="flex items-center justify-between border-b border-slate-100 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">Notifications</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {unread} unread updates
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void reload()}
                    disabled={loading}
                    className="rounded-xl bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-400"
                    title="Refresh"
                    aria-label="Refresh notifications"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400"
                    title="Close"
                    aria-label="Close notifications"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
              </motion.div>

              <div className="max-h-96 overflow-y-auto p-2">
                {loading && notifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                    <Loader2 className="animate-spin" size={24} />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      Fetching updates...
                    </p>
                  </div>
                )}

                {fetchError && notifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <p className="text-sm font-bold text-red-500">Failed to load notifications</p>
                    <button
                      type="button"
                      onClick={() => void reload()}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!loading && !fetchError && notifications.length === 0 && !import.meta.env.DEV && (
                  <div className="py-12 text-center">
                    <p className="text-sm font-bold text-slate-400">All caught up!</p>
                  </div>
                )}

                {!loading && !fetchError && notifications.length === 0 && import.meta.env.DEV && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Realtime center ready (Dev)
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Announcements, chat, and admin events can surface here.
                    </p>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Just now
                    </p>
                  </div>
                )}

                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-900',
                      !isRead(item) && 'bg-blue-50/70 dark:bg-blue-950/30'
                    )}
                  >
                    <button
                      type="button"
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
                        <motion.div layout className="min-w-0 flex-1 pr-8">
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
                        </motion.div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => void deleteNotification(item, e)}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/40"
                      title="Dismiss"
                      aria-label="Dismiss notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {notifications.length > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    disabled={unread === 0}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    <CheckCircle2 size={14} />
                    Mark all read
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearRead()}
                    disabled={notifications.filter(isRead).length === 0}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Trash2 size={14} />
                    Clear read
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
}
