import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useDocuments } from '../../lib/documents';

interface NotificationRecord {
  id?: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const { data } = useDocuments<NotificationRecord>('notifications', { limit: 8 });
  const notifications = data.length
    ? data
    : [
        {
          id: 'demo-welcome',
          title: 'Realtime center ready',
          message: 'Announcements, chat, and admin events can surface here.',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
  const unread = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute right-0 z-50 mt-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[26px] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-black text-slate-950">Notifications</p>
                <p className="text-xs font-medium text-slate-500">{unread} unread updates</p>
              </div>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {notifications.map((item) => (
                <div key={item.id} className="rounded-2xl p-3 hover:bg-slate-50">
                  <p className="font-bold text-slate-900">{item.title || 'Notification'}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{item.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
