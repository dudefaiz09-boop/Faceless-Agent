import React, { useState, Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
  GraduationCap,
  Bot,
  Baby,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ModuleGuard } from './components/ModuleGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModuleErrorBoundary } from './components/ModuleErrorBoundary';
import { canAccessModule, type ModuleKey } from '@educonnect/shared';
import { CommandPalette } from './components/saas/CommandPalette';
import { NotificationDropdown } from './components/saas/NotificationDropdown';
import { ThemeToggle } from './components/saas/ThemeToggle';
import { GlobalChatbot } from './components/saas/GlobalChatbot';
import { ProfileModal } from './components/saas/ProfileModal';
import { DashboardPage } from './pages/Dashboard';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

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
const ParentPortal = lazy(() =>
  import('./pages/ParentPortal').then((m) => ({ default: m.ParentPortal }))
);

// --- Components ---

const SidebarLink = ({
  to,
  icon: Icon,
  label,
  active,
  onNavigate,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) => (
  <Link
    to={to}
    onClick={onNavigate}
    className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    )}
  >
    <Icon size={20} className="shrink-0" />
    <span className="font-medium truncate">{label}</span>
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, role, assignedModules, signOut } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-950 dark:bg-slate-950 dark:text-slate-100">
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
          'fixed inset-y-0 left-0 w-72 bg-white/85 border-r border-white/80 z-40 transform lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out px-4 py-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:bg-slate-950/90 dark:border-slate-800 dark:shadow-none',
          'flex flex-col',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-4 mb-8 shrink-0">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 via-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <GraduationCap size={24} />
          </div>
          <div>
            <span className="block text-xl font-black text-slate-950 tracking-tight dark:text-white">
              EduConnect
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
              AI ERP
            </span>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          {menuItems
            .filter((item) => role && canAccessModule(role, item.module, assignedModules))
            .map((item) => (
              <SidebarLink
                key={item.to}
                {...item}
                active={location.pathname === item.to}
                onNavigate={() => setIsSidebarOpen(false)}
              />
            ))}
        </nav>

        <div className="pt-4 shrink-0">
          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 dark:text-slate-300 dark:hover:bg-red-950/40"
          >
            {isSigningOut ? <LoadingSpinner className="text-red-600" /> : <LogOut size={20} />}
            <span className="font-medium">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-0">
        <header className="h-20 bg-white/75 border-b border-white/80 flex items-center justify-between px-6 lg:px-10 backdrop-blur-xl dark:bg-slate-950/75 dark:border-slate-800 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600">
            <Menu size={24} />
          </button>

          <button className="hidden md:flex h-11 min-w-80 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            <span className="flex-1">Search or press command palette</span>
            <kbd className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              Ctrl K
            </kbd>
          </button>

          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationDropdown />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user?.displayName}
              </p>
              <p className="text-xs text-slate-500 capitalize dark:text-slate-400">{role}</p>
            </div>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-slate-100 hover:ring-blue-400 dark:ring-slate-800 transition-all cursor-pointer"
            >
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.08),transparent_30%)] p-4 md:p-6 lg:p-8 space-y-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_30%)]">
          {children}
        </div>
      </main>
      <GlobalChatbot />
      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

// --- App Container ---

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

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

  if (!user) {
    return (
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    );
  }

  if (location.pathname.startsWith('/auth/')) {
    return <Navigate to="/" replace />;
  }

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
                <ModuleErrorBoundary>
                  <AssignmentsPage />
                </ModuleErrorBoundary>
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
