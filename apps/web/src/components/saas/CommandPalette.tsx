import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { canAccessModule, type ModuleKey } from '@educonnect/shared';
import { useAuth } from '../../contexts/AuthContext';

const actions: Array<{ label: string; hint: string; path: string; module: ModuleKey }> = [
  { label: 'Dashboard', hint: 'Open command center', path: '/', module: 'dashboard' },
  { label: 'AI Assistant', hint: 'Ask EduConnect AI', path: '/chatbot', module: 'aiAssistant' },
  { label: 'Announcements', hint: 'Search school updates', path: '/announcements', module: 'announcements' },
  { label: 'Attendance', hint: 'Review attendance', path: '/attendance', module: 'attendance' },
  { label: 'Assignments', hint: 'Manage coursework', path: '/assignments', module: 'assignments' },
  { label: 'Chat', hint: 'Open realtime messages', path: '/chat', module: 'chat' },
  { label: 'Library', hint: 'Browse catalog', path: '/library', module: 'library' },
  { label: 'Fees', hint: 'Track billing', path: '/fees', module: 'fees' },
  { label: 'Performance', hint: 'Open analytics', path: '/performance', module: 'performance' },
  { label: 'Students', hint: 'Manage students', path: '/students', module: 'students' },
  { label: 'Teachers', hint: 'Manage faculty', path: '/teachers', module: 'teachers' },
  { label: 'All Users', hint: 'Role management', path: '/all-users', module: 'allUsers' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { role, assignedModules } = useAuth();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const visibleActions = useMemo(() => {
    return actions
      .filter((action) => role && canAccessModule(role, action.module, assignedModules))
      .filter((action) => `${action.label} ${action.hint}`.toLowerCase().includes(query.toLowerCase()));
  }, [assignedModules, query, role]);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/30 p-4 pt-[12vh] backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/20"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <Search size={20} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules, actions, or jump anywhere..."
                className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />
              <kbd className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">Esc</kbd>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {visibleActions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => go(action.path)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left hover:bg-blue-50"
                >
                  <span>
                    <span className="block font-black text-slate-900">{action.label}</span>
                    <span className="text-sm font-medium text-slate-500">{action.hint}</span>
                  </span>
                  <Sparkles size={16} className="text-blue-500" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
