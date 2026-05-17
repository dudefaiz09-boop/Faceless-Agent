import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCircle2, ExternalLink, Trash2, RefreshCcw, X as CloseIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api-client';
import { useDocuments } from '../../lib/documents';
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
  const { user, role, roles, classIds, schoolId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => new Set());
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    right: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data, loading, reload } = useDocuments<NotificationRecord>('notifications', {
    limit: 20,
    order: { field: 'createdAt', ascending: false },
    realtime: true,
  });

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
      const pos = calculatePosition();
      setDropdownPosition(pos);
      if (import.meta.env.DEV) {
        console.info('[Notifications] Open', pos);
      }
    }
    setOpen(nextOpen);
  };
  const visibleNotifications = useMemo(
    () =>
      data.filter((item) => {
        const targetUserIds = item.targetUserIds || [];
        const targetRoles = item.targetRoles || ['all'];
        const targetClasses = item.targetClasses || ['all'];
        const userMatch = targetUserIds.length === 0 || targetUserIds.includes(user?.uid || '');
        const roleMatch =
          targetRoles.includes('all') ||
          [role, ...roles]
            .filter(Boolean)
            .some((candidate) => targetRoles.includes(candidate as string));
        const classMatch =
          targetClasses.includes('all') ||
          classIds.some((classId) => targetClasses.includes(classId));
        const schoolMatch = !item.schoolId || !schoolId || item.schoolId === schoolId;
        return userMatch && roleMatch && classMatch && schoolMatch;
      }),
    [classIds, data, role, roles, schoolId, user?.uid]
  );

  const notifications = useMemo(() => {
    if (visibleNotifications.length) return visibleNotifications;
    if (import.meta.env.DEV) {
      return [
        {
          id: 'demo-welcome',
          title: 'Realtime center ready',
          message: 'Announcements, chat, and admin events can surface here.',
          read: true,
          readBy: user?.uid ? [user.uid] : [],
          targetRoles: ['all'],
          targetClasses: ['all'],
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  }, [visibleNotifications, user]);
  const isRead = (item: NotificationRecord) =>
    item.read ||
    (item.id ? localReadIds.has(item.id) : false) ||
    (user?.uid ? item.readBy?.includes(user.uid) : false);
  const unread = notifications.filter((item) => !isRead(item)).length;

  const markRead = async (item: NotificationRecord) => {
    if (!item.id || item.id.startsWith('demo-') || isRead(item)) return;
    setLocalReadIds((current) => new Set(current).add(item.id!));
    try {
      await apiClient.request(`/api/notifications/${item.id}/read`, { method: 'PATCH' });
    } catch (error) {
      setLocalReadIds((current) => {
        const next = new Set(current);
        next.delete(item.id!);
        return next;
      });
      toast({
        tone: 'error',
        title: 'Notification update failed',
        description: error instanceof Error ? error.message : 'Unable to mark notification read.',
      });
    }
  };

  const markAllRead = async () => {
    const ids = notifications
      .filter((n) => !isRead(n))
      .map((item) => item.id)
      .filter(Boolean) as string[];
    if (ids.length === 0) return;

    setLocalReadIds((current) => new Set([...current, ...ids]));
    try {
      await apiClient.request('/api/notifications/read-all', { method: 'PATCH' });
      toast({
        tone: 'success',
        title: 'Notifications cleared',
        description: 'Visible updates were marked as read.',
      });
    } catch (error) {
      setLocalReadIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast({
        tone: 'error',
        title: 'Notification update failed',
        description:
          error instanceof Error ? error.message : 'Unable to mark all notifications read.',
      });
    }
  };

  const clearRead = async () => {
    const readIds = notifications
      .filter((n) => isRead(n))
      .map((n) => n.id)
      .filter(Boolean) as string[];
    if (readIds.length === 0) return;

    try {
      await apiClient.request('/api/notifications/read', { method: 'DELETE' });
      toast({
        tone: 'success',
        title: 'History cleared',
        description: 'Read notifications were removed from your list.',
      });
      void reload();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Unable to clear history.',
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
    if (!item.id || item.id.startsWith('demo-')) return;

    try {
      await apiClient.request(`/api/notifications/${item.id}`, { method: 'DELETE' });
      toast({
        tone: 'success',
        title: 'Notification deleted',
        description: 'The notification has been removed.',
      });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete notification.',
      });
    }
  };

  // Handle positioning on resize/scroll
  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const pos = calculatePosition();
      if (pos) setDropdownPosition(pos);
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, calculatePosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
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

    // Use mousedown to catch clicks outside early
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const dropdownContent = (
    <AnimatePresence>
      {open && dropdownPosition && (
        <motion.div
          ref={contentRef}
          role="dialog"
          aria-label="Notifications"
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right,
            width: dropdownPosition.width,
            maxHeight: 'min(70vh, 520px)',
          }}
          className="fixed z-[99999] flex flex-col overflow-hidden rounded-[26px] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
        >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">Notifications</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {unread} unread updates
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void reload()}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refresh"
                >
                  <RefreshCcw size={18} className={cn(loading && 'animate-spin')} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Close"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <RefreshCcw size={24} className="animate-spin text-blue-600 mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Loading notifications...
                  </p>
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    <Bell size={32} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">All caught up!</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    No new notifications found.
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
                  {!item.id?.startsWith('demo-') && (
                    <button
                      onClick={(e) => void deleteNotification(item, e)}
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950"
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-100 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                <CheckCircle2 size={14} />
                Mark all read
              </button>
              <button
                type="button"
                onClick={clearRead}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-xs font-bold text-slate-900 transition-all hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                <Trash2 size={14} />
                Clear read
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">
            {unread}
          </span>
        )}
      </button>
      {createPortal(dropdownContent, document.body)}
    </div>
  );
}
