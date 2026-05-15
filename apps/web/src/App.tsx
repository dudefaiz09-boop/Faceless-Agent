import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  Library,
  BookOpen,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Bot,
  Baby,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ModuleGuard } from './components/ModuleGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { canAccessModule, type ModuleKey } from '@educonnect/shared';
import { CommandPalette } from './components/saas/CommandPalette';
import { NotificationDropdown } from './components/saas/NotificationDropdown';
import { DashboardPage } from './pages/Dashboard';

// --- Lazy loaded pages ---
const AnnouncementsPage = lazy(() =>
  import('./pages/Announcements').then((m) => ({ default: m.AnnouncementsPage }))
);
const AttendancePage = lazy(() =>
  import('./pages/Attendance').then((m) => ({ default: m.AttendancePage }))
);
const UsersPage = lazy(() => import('./pages/Users').then((m) => ({ default: m.UsersPage })));
const StudentsPage = lazy(() =>
  import('./pages/Students').then((m) => ({ default: m.StudentsPage }))
);
const TeachersPage = lazy(() =>
  import('./pages/Teachers').then((m) => ({ default: m.TeachersPage }))
);
const AssignmentsPage = lazy(() =>
  import('./pages/Assignments').then((m) => ({ default: m.AssignmentsPage }))
);
const ChatPage = lazy(() => import('./pages/Chat').then((m) => ({ default: m.ChatPage })));
const LibraryPage = lazy(() => import('./pages/Library').then((m) => ({ default: m.LibraryPage })));
const FeesPage = lazy(() => import('./pages/Fees').then((m) => ({ default: m.FeesPage })));
const PerformancePage = lazy(() =>
  import('./pages/Performance').then((m) => ({ default: m.PerformancePage }))
);
const ChatbotPage = lazy(() => import('./pages/Chatbot').then((m) => ({ default: m.ChatbotPage })));
const ParentPortal = lazy(() =>
  import('./pages/ParentPortal').then((m) => ({ default: m.ParentPortal }))
);

// --- Components ---

const SidebarLink = ({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'text-slate-600 hover:bg-slate-100'
    )}
  >
    <Icon size={20} className="shrink-0" />
    <span className="font-medium truncate">{label}</span>
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, role, assignedModules } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems: Array<{
    to: string;
    icon: React.ElementType;
    label: string;
    module: ModuleKey;
  }> = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: 'Dashboard',
      module: 'dashboard',
    },
    {
      to: '/chatbot',
      icon: Bot,
      label: 'AI Assistant',
      module: 'aiAssistant',
    },
    {
      to: '/announcements',
      icon: Bell,
      label: 'Announcements',
      module: 'announcements',
    },
    {
      to: '/attendance',
      icon: Calendar,
      label: 'Attendance',
      module: 'attendance',
    },
    {
      to: '/assignments',
      icon: BookOpen,
      label: 'Assignments',
      module: 'assignments',
    },
    {
      to: '/chat',
      icon: MessageSquare,
      label: 'Chat',
      module: 'chat',
    },
    {
      to: '/library',
      icon: Library,
      label: 'Library',
      module: 'library',
    },
    {
      to: '/fees',
      icon: CreditCard,
      label: 'Fees',
      module: 'fees',
    },
    {
      to: '/performance',
      icon: BarChart3,
      label: 'Performance',
      module: 'performance',
    },
    { to: '/parent-portal', icon: Baby, label: 'Parent Portal', module: 'parentPortal' },
    { to: '/students', icon: Users, label: 'Students', module: 'students' },
    { to: '/teachers', icon: GraduationCap, label: 'Teachers', module: 'teachers' },
    { to: '/all-users', icon: Shield, label: 'All Users', module: 'allUsers' },
  ];

  const handleLogout = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-950">
      <CommandPalette />
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-72 bg-white/85 border-r border-white/80 z-50 transform lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out px-4 py-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl',
          'flex flex-col',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-4 mb-8 shrink-0">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 via-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <GraduationCap size={24} />
          </div>
          <div>
            <span className="block text-xl font-black text-slate-950 tracking-tight">EduConnect</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">AI ERP</span>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          {menuItems
            .filter((item) => role && canAccessModule(role, item.module, assignedModules))
            .map((item) => (
              <SidebarLink key={item.to} {...item} active={location.pathname === item.to} />
            ))}
        </nav>

        <div className="pt-4 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/75 border-b border-white/80 flex items-center justify-between px-6 lg:px-10 backdrop-blur-xl">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600">
            <Menu size={24} />
          </button>

          <button className="hidden md:flex h-11 min-w-80 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-400 shadow-sm">
            <span className="flex-1">Search or press command palette</span>
            <kbd className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">Ctrl K</kbd>
          </button>

          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.displayName}</p>
              <p className="text-xs text-slate-500 capitalize">{role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-slate-100">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.08),transparent_30%)] p-4 md:p-6 lg:p-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorObj = err as { code?: string; message?: string };
      if (errorObj.message?.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(errorObj.message || 'An unexpected error occurred.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10 text-center"
      >
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg rotate-3">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">EduConnect Portal</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Sign in to your account to access the EduConnect system.
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
              placeholder="user@educonnect.app"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
              <X size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={signingIn}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] mt-4 disabled:opacity-50"
          >
            {signingIn ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50">
          <p className="text-[10px] text-slate-400 uppercase leading-relaxed font-bold tracking-widest">
            &copy; 2026 EduConnect Academy <br />
            Secure Academic Management System
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Pages ---

const Dashboard = () => {
  const { user } = useAuth();
  const stats = [
    { label: 'Attendance', value: '98%', trend: '+2%', color: 'bg-blue-50 text-blue-600' },
    { label: 'Assignments', value: '12', sub: 'Active', color: 'bg-indigo-50 text-indigo-600' },
    {
      label: 'Events Today',
      value: '3',
      sub: 'Scheduled',
      color: 'bg-emerald-50 text-emerald-600',
    },
    { label: 'Avg Grade', value: 'A-', trend: '+1.5%', color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
          Howdy, {user?.displayName?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-slate-500 text-lg">Here&apos;s what happening in your academy today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center font-bold',
                stat.color
              )}
            >
              {stat.label[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                {stat.trend && (
                  <span className="text-xs font-bold text-emerald-500">{stat.trend}</span>
                )}
                {stat.sub && <span className="text-xs font-medium text-slate-400">{stat.sub}</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Recent Announcements</h2>
            <Link
              to="/announcements"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900">Annual Sports Meet 2024</h3>
                  <span className="text-xs font-medium text-slate-400">2h ago</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm">
                  We are excited to announce our upcoming sports meet scheduled for next Friday. All
                  participants are requested...
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Upcoming Events</h2>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            {[
              { time: '10:00 AM', title: 'Mathematics Exam', type: 'Exam' },
              { time: '01:30 PM', title: 'Art & Design Workshop', type: 'Activity' },
              { time: '04:00 PM', title: 'Parent-Teacher Meet', type: 'Meeting' },
            ].map((event, i) => (
              <div key={i} className="flex gap-4">
                <div className="text-xs font-bold text-slate-400 w-16 pt-1">{event.time}</div>
                <div className="flex-1 pb-6 border-l border-slate-100 pl-4 relative">
                  <div className="absolute top-1 -left-[5px] w-2 h-2 rounded-full bg-blue-500" />
                  <p className="font-bold text-slate-800 text-sm">{event.title}</p>
                  <p className="text-xs text-slate-400">{event.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Container ---

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-blue-600"
        >
          <GraduationCap size={48} />
        </motion.div>
      </div>
    );

  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
              Loading Module...
            </p>
          </div>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <ModuleGuard module="dashboard">
                <DashboardPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/chatbot"
            element={
              <ModuleGuard module="aiAssistant">
                <ChatbotPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/announcements"
            element={
              <ModuleGuard module="announcements">
                <AnnouncementsPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/attendance"
            element={
              <ModuleGuard module="attendance">
                <AttendancePage />
              </ModuleGuard>
            }
          />
          <Route
            path="/assignments"
            element={
              <ModuleGuard module="assignments">
                <AssignmentsPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/chat"
            element={
              <ModuleGuard module="chat">
                <ChatPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/library"
            element={
              <ModuleGuard module="library">
                <LibraryPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/fees"
            element={
              <ModuleGuard module="fees">
                <FeesPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/performance"
            element={
              <ModuleGuard module="performance">
                <PerformancePage />
              </ModuleGuard>
            }
          />
          <Route
            path="/parent-portal"
            element={
              <ModuleGuard module="parentPortal">
                <ParentPortal />
              </ModuleGuard>
            }
          />
          <Route
            path="/students"
            element={
              <ModuleGuard module="students">
                <StudentsPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/teachers"
            element={
              <ModuleGuard module="teachers">
                <TeachersPage />
              </ModuleGuard>
            }
          />
          <Route
            path="/all-users"
            element={
              <ModuleGuard module="allUsers">
                <UsersPage type="all" />
              </ModuleGuard>
            }
          />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
