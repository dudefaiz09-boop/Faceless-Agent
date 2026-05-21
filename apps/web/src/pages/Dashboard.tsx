import React from 'react';
import { motion } from 'motion/react';
import type React from 'react';
import {
  Activity,
  Banknote,
  BookOpen,
  Brain,
  CalendarDays,
  GraduationCap,
  Megaphone,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/saas/StatCard';
import { AnalyticsChart } from '../components/saas/AnalyticsChart';
import { QuickActionCard } from '../components/saas/QuickActionCard';
import { PageShell } from '../components/ui/PageShell';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../lib/documents';
import { cn } from '../lib/utils';

const attendanceTrend = [
  { label: 'Mon', value: 92 },
  { label: 'Tue', value: 95 },
  { label: 'Wed', value: 88 },
  { label: 'Thu', value: 94 },
  { label: 'Fri', value: 97 },
  { label: 'Sat', value: 91 },
];

// TODO: Replace with real financial data from Supabase fees collection
const revenueTrend = [
  { label: 'Jan', value: 42 },
  { label: 'Feb', value: 56 },
  { label: 'Mar', value: 49 },
  { label: 'Apr', value: 72 },
  { label: 'May', value: 86 },
  { label: 'Jun', value: 93 },
];

const performanceTrend = [
  { label: 'Math', value: 82 },
  { label: 'Sci', value: 88 },
  { label: 'Eng', value: 78 },
  { label: 'Hist', value: 84 },
  { label: 'Art', value: 91 },
];

type UserRole =
  | 'admin'
  | 'principal'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'librarian'
  | 'accountant'
  | 'staff';

type DashboardUser = {
  role?: UserRole;
  roles?: UserRole[];
};

type DashboardAnnouncement = {
  id?: string;
  title?: string;
  content?: string;
  createdAt?: string;
};

const roleCopy: Record<UserRole, { title: string; subtitle: string; insight: string }> = {
  admin: {
    title: 'School Command Center',
    subtitle: 'Live operations, revenue, attendance, and AI-backed recommendations.',
    insight:
      'Attendance is trending upward this week. Follow up with classes below 88% and send a fee reminder to pending accounts.',
  },
  principal: {
    title: 'Academic Leadership Hub',
    subtitle: 'Monitor teaching quality, attendance, reports, and student outcomes.',
    insight:
      'Grade 10A is improving in assignments but needs attendance reinforcement. Schedule a faculty review this week.',
  },
  teacher: {
    title: 'Teaching Workspace',
    subtitle: "Today's classes, submissions, attendance, and lesson support in one place.",
    insight:
      'Three students need feedback on pending submissions. Generate a short revision quiz for tomorrow.',
  },
  student: {
    title: 'Student Learning Hub',
    subtitle: 'Assignments, attendance, grades, announcements, and study planning.',
    insight:
      'Your learning streak is strong. Review science notes for 20 minutes before the next quiz.',
  },
  parent: {
    title: 'Parent Overview',
    subtitle: 'Track attendance, fees, assignments, and school communication.',
    insight: 'One assignment is due soon. Check the parent portal for details and teacher notes.',
  },
  librarian: {
    title: 'Library Operations',
    subtitle: 'Catalog activity, borrowing trends, due reminders, and recommendations.',
    insight: 'Reading activity is strongest in Grade 10. Promote curated science titles this week.',
  },
  accountant: {
    title: 'Finance Console',
    subtitle: 'Fee collection, dues, receipts, and revenue analytics.',
    insight:
      'Collection velocity is healthy. Prioritize installment reminders for accounts over 30 days.',
  },
  staff: {
    title: 'Staff Workspace',
    subtitle: 'Daily support tasks, attendance assistance, and student service activity.',
    insight: 'Two support tickets need follow-up. Review attendance corrections before end of day.',
  },
};

export function DashboardPage() {
  const { role } = useAuth();
  const { data: announcements } = useDocuments<DashboardAnnouncement>('announcements', {
    order: { field: 'createdAt', ascending: false },
    limit: 4,
  });
  const { data: users } = useDocuments<DashboardUser>('users');
  const userRole = (role as UserRole) || 'student';
  const copy = roleCopy[userRole] || roleCopy.student;

  const { studentCount, teacherCount } = React.useMemo(
    () => ({
      studentCount: users.filter((u) => u.role === 'student' || u.roles?.includes('student'))
        .length,
      teacherCount: users.filter((u) => u.role === 'teacher' || u.roles?.includes('teacher'))
        .length,
    }),
    [users]
  );

  const stats =
    role === 'teacher'
      ? [
          {
            title: 'Classes Today',
            value: '5',
            detail: 'Two lab sessions',
            icon: CalendarDays,
            tone: 'blue' as const,
          },
          {
            title: 'Submissions',
            value: '28',
            detail: '7 need grading',
            icon: BookOpen,
            tone: 'violet' as const,
          },
          {
            title: 'Attendance',
            value: '94%',
            detail: 'Across assigned classes',
            icon: Activity,
            tone: 'emerald' as const,
          },
          {
            title: 'AI Drafts',
            value: '3',
            detail: 'Lesson ideas ready',
            icon: Brain,
            tone: 'cyan' as const,
          },
        ]
      : role === 'student'
        ? [
            {
              title: 'Attendance',
              value: '96%',
              detail: 'Great consistency',
              icon: Activity,
              tone: 'emerald' as const,
            },
            {
              title: 'Assignments',
              value: '4',
              detail: 'Due this week',
              icon: BookOpen,
              tone: 'blue' as const,
            },
            {
              title: 'Average',
              value: 'A-',
              detail: 'Up 4% this term',
              icon: GraduationCap,
              tone: 'violet' as const,
            },
            {
              title: 'Study Plan',
              value: '2h',
              detail: 'Recommended today',
              icon: Brain,
              tone: 'cyan' as const,
            },
          ]
        : [
            {
              title: 'Students',
              value: users.length > 0 ? String(studentCount) : '...',
              detail: 'Active learners',
              icon: Users,
              tone: 'blue' as const,
              trend: '+6%',
            },
            {
              title: 'Teachers',
              value: users.length > 0 ? String(teacherCount) : '...',
              detail: 'Faculty coverage',
              icon: GraduationCap,
              tone: 'violet' as const,
            },
            {
              title: 'Attendance',
              value: '93%',
              detail: 'School-wide today',
              icon: Activity,
              tone: 'emerald' as const,
              trend: '+2%',
            },
            {
              title: 'Revenue',
              value: '86%',
              detail: 'Collection progress',
              icon: Banknote,
              tone: 'cyan' as const,
            },
          ];

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-slate-950 p-6 text-white shadow-2xl shadow-blue-950/20 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.45),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.28),transparent_32%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              {role || 'student'} workspace
            </p>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-300 md:text-lg">
              {copy.subtitle}
            </p>
          </div>
          <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-cyan-200">
              <Sparkles size={18} />
              <span className="text-xs font-black uppercase tracking-[0.18em]">AI insight</span>
            </div>
            <p className="text-sm font-medium leading-6 text-white">{copy.insight}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AnalyticsChart
          title={role === 'accountant' ? 'Fee Collection Velocity' : 'Attendance Intelligence'}
          subtitle={
            role === 'student'
              ? 'Your weekly consistency'
              : 'Realtime trend from current operational data'
          }
          data={role === 'accountant' || role === 'admin' ? revenueTrend : attendanceTrend}
          dataKey="value"
        />
        <AnalyticsChart
          title="Performance Mix"
          subtitle="Subject-level pulse for faster interventions"
          data={performanceTrend}
          dataKey="value"
          variant="bar"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Quick Actions</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Fast paths for today&apos;s work
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Ask AI', 'Generate lessons, reports, or study help.', '/chatbot', Brain],
              [
                'Post update',
                'Publish a targeted school announcement.',
                '/announcements',
                Megaphone,
              ],
              ['Mark attendance', 'Record daily attendance faster.', '/attendance', Activity],
              ['Create assignment', 'Draft and publish class work.', '/assignments', BookOpen],
            ].map(([label, description, path, Icon]) => (
              <QuickActionCard
                key={String(label)}
                title={String(label)}
                description={String(description)}
                to={String(path)}
                icon={Icon as React.ElementType}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                Realtime Announcements
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Live updates from your school
              </p>
            </div>
            <Link to="/announcements" className="text-sm font-black text-blue-600">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(announcements.length
              ? announcements
              : [
                  {
                    id: 'empty',
                    title: 'No announcements yet',
                    content: 'New school updates will appear here instantly.',
                  },
                ]
            ).map((announcement, index) => (
              <motion.div
                key={announcement.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-2xl border p-4',
                  index === 0
                    ? 'border-blue-100 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/50'
                    : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70'
                )}
              >
                <p className="font-black text-slate-900 dark:text-white">{announcement.title}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {announcement.content}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
