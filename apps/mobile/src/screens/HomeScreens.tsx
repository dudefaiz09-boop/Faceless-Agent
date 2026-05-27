import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAnnouncements } from '@educonnect/shared-api';
import { canAccessModule, type ModuleKey } from '@educonnect/shared';
import { AssignmentsScreen } from './AssignmentsScreen';
import { useAuth } from '../contexts/AuthContext';
import { announcementsService, usersService } from '../lib/api-client';
import { colors, formatDate } from '../theme';
import {
  Card,
  EmptyState,
  ErrorState,
  ModuleHeader,
  Pill,
  SearchInput,
  StatCard,
} from '../components/ModuleUi';

type UserRecord = {
  id?: string;
  uid?: string;
  displayName?: string;
  email?: string;
  role?: string;
  roles?: string[];
  status?: string;
  classId?: string;
  classIds?: string[];
  section?: string;
  subjects?: string[];
  subjectIds?: string[];
  classes?: string[];
  linkedStudentIds?: string[];
  assignedModules?: string[];
};

type DashboardAnnouncement = {
  id: string;
  title?: string;
  content?: string;
  createdAt?: string;
};

const roleCopy: Record<string, { title: string; subtitle: string; insight: string }> = {
  admin: {
    title: 'School Command Center',
    subtitle: 'Operations, roles, attendance, fees, and school communication.',
    insight:
      'Use the More menu for protected admin modules such as Students, Teachers, and All Users.',
  },
  principal: {
    title: 'Academic Leadership Hub',
    subtitle: 'Monitor attendance, class performance, faculty, and school updates.',
    insight:
      'Attendance, performance, and teacher lists are visible according to your module access.',
  },
  teacher: {
    title: 'Teaching Workspace',
    subtitle: 'Assignments, attendance, class communication, and student progress.',
    insight: 'Start with Assignments and Attendance, then use Chat for class follow-up.',
  },
  student: {
    title: 'Student Learning Hub',
    subtitle: 'Assignments, attendance, grades, announcements, and library resources.',
    insight: 'Your available modules match the same access policy used by the website.',
  },
  parent: {
    title: 'Parent Overview',
    subtitle: 'Track linked children, attendance, assignments, fees, and updates.',
    insight: 'Parent Portal combines child-specific academic and finance records.',
  },
  librarian: {
    title: 'Library Operations',
    subtitle: 'Catalog resources, borrowing activity, and school communication.',
    insight: 'Library actions appear only when the backend allows them for your role.',
  },
  accountant: {
    title: 'Finance Console',
    subtitle: 'Fee summaries, payment status, and family communication.',
    insight: 'Fee reports are scoped by tenant and your backend permissions.',
  },
  staff: {
    title: 'Staff Workspace',
    subtitle: 'Daily school support, attendance assistance, and student services.',
    insight: 'Only modules granted to your role are shown in the mobile navigation.',
  },
};

function roleOf(user: UserRecord) {
  return user.role || user.roles?.[0] || 'student';
}
async function listMobileUsers(args: {
  schoolId: string | null;
  role?: 'student' | 'teacher';
}): Promise<UserRecord[]> {
  const data = (await usersService.list({
    tenantId: args.schoolId || undefined,
    role: args.role,
    limit: 250,
  })) as UserRecord[];

  return Array.isArray(data) ? data : [];
}

function useMobileUsers(schoolId: string | null, role?: 'student' | 'teacher') {
  return useQuery({
    queryKey: ['mobile-users', schoolId, role || 'all'],
    queryFn: () => listMobileUsers({ schoolId, role }),
    enabled: Boolean(schoolId),
    retry: 1,
  });
}
export function DashboardScreen({ onOpenModule }: { onOpenModule: (module: ModuleKey) => void }) {
  const { role, assignedModules, schoolId } = useAuth();
  const usersQuery = useMobileUsers(schoolId);
  const users = usersQuery.data || [];
  const usersLoading = usersQuery.isLoading || usersQuery.isRefetching;
  const {
    data: announcements = [],
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useAnnouncements(announcementsService, schoolId);

  const copy = roleCopy[role] || roleCopy.student;
  const students = users.filter((item) => roleOf(item) === 'student');
  const teachers = users.filter((item) => roleOf(item) === 'teacher');
  const activeUsers = users.filter((item) => item.status !== 'inactive');
  const latest = announcements[0] as DashboardAnnouncement | undefined;
  const quickModules: ModuleKey[] = ['announcements', 'attendance', 'assignments', 'chat'];

  const refresh = () => {
    void usersQuery.refetch();
    void refetch();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      refreshControl={
        <RefreshControl
          tintColor={colors.ai}
          refreshing={isRefetching || usersLoading}
          onRefresh={refresh}
        />
      }
    >
      <View style={styles.heroPanel}>
        <View style={styles.workspacePill}>
          <Text style={styles.workspacePillText}>{role} workspace</Text>
        </View>
        <Text style={styles.heroTitle}>{copy.title}</Text>
        <Text style={styles.heroSubtitle}>{copy.subtitle}</Text>
        <View style={styles.aiInsightCard}>
          <Text style={styles.aiInsightEyebrow}>Access aware</Text>
          <Text style={styles.aiInsightBody}>{copy.insight}</Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatCard title="Students" value={String(students.length)} detail="Visible learners" />
        <StatCard
          title="Teachers"
          value={String(teachers.length)}
          detail="Visible faculty"
          tone="violet"
        />
        <StatCard
          title="Active"
          value={String(activeUsers.length)}
          detail="Tenant users"
          tone="green"
        />
        <StatCard
          title="Updates"
          value={String(announcements.length)}
          detail="Announcements"
          tone="cyan"
        />
      </View>

      <Card>
        <Text style={styles.panelTitle}>Quick Actions</Text>
        <Text style={styles.panelSubtitle}>{"Fast paths for today's work"}</Text>
        <View style={styles.quickActionGrid}>
          {quickModules
            .filter((module) => canAccessModule(role, module, assignedModules))
            .map((module) => (
              <TouchableOpacity
                key={module}
                style={styles.quickActionCard}
                onPress={() => onOpenModule(module)}
              >
                <Pill label={module} />
                <Text style={styles.quickActionTitle}>{moduleLabels[module]}</Text>
                <Text style={styles.quickActionBody}>
                  Open the mobile version of this website module.
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </Card>

      <Card style={styles.featuredAnnouncement}>
        <View style={styles.panelHeaderRow}>
          <View style={styles.panelHeaderText}>
            <Text style={styles.panelTitle}>Realtime Announcements</Text>
            <Text style={styles.panelSubtitle}>Last synced {formatDate(dataUpdatedAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => onOpenModule('announcements')}>
            <Text style={styles.linkText}>View all</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.cardTitle}>{latest?.title || 'No announcements yet'}</Text>
        <Text style={styles.cardContent}>
          {latest?.content || 'New school updates will appear here when available.'}
        </Text>
      </Card>
    </ScrollView>
  );
}

export function AnnouncementsScreen() {
  const { schoolId } = useAuth();
  const [query, setQuery] = useState('');
  const {
    data: announcements = [],
    dataUpdatedAt,
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useAnnouncements(announcementsService, schoolId);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return announcements;
    return announcements.filter((item) =>
      `${item.title || ''} ${item.content || ''}`.toLowerCase().includes(normalized)
    );
  }, [announcements, query]);

  return (
    <View style={styles.flex}>
      <ModuleHeader
        title="School Updates"
        subtitle="Priority-aware broadcasts and role-targeted announcements."
      />
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search announcements" />
      {isError ? (
        <ErrorState
          message={(error as Error)?.message || 'Announcements are temporarily unavailable.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            isLoading ? null : (
              <EmptyState
                title="No announcements found"
                body="Try a different search or pull to refresh."
              />
            )
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <Text style={styles.syncedText}>Last synced {formatDate(dataUpdatedAt)}</Text>
            ) : null
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.ai}
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Pill label={(item as any).priority || item.visibility || 'update'} />
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardContent}>{item.content}</Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

export function AssignmentsModuleScreen() {
  return (
    <View style={styles.flex}>
      <ModuleHeader title="Assignments" subtitle="Upcoming work, due items, and class tasks." />
      <AssignmentsScreen />
    </View>
  );
}

export function DirectoryScreen({ type }: { type: 'student' | 'teacher' | 'all' }) {
  const { schoolId, isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const directoryRole = type === 'all' ? undefined : type;
  const usersQuery = useMobileUsers(schoolId, directoryRole);
  const users = usersQuery.data || [];
  const loading = usersQuery.isLoading;
  const error = usersQuery.error as Error | null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((profile) => {
      const role = roleOf(profile);
      const matchesType = type === 'all' || role === type;
      const haystack = `${profile.displayName || ''} ${profile.email || ''} ${role} ${
        profile.classId || ''
      } ${(profile.subjects || profile.subjectIds || []).join(' ')}`.toLowerCase();
      return matchesType && (!normalized || haystack.includes(normalized));
    });
  }, [query, type, users]);

  const title =
    type === 'student'
      ? 'Student Management'
      : type === 'teacher'
        ? 'Faculty Management'
        : 'All Users';
  const subtitle =
    type === 'all'
      ? 'Role, status, tenant, and module visibility from shared profile data.'
      : 'Profiles and assignments synced from the same user documents as the website.';

  return (
    <View style={styles.flex}>
      <ModuleHeader title={title} subtitle={subtitle}>
        {!isAdmin && <Pill label="read only" tone="amber" />}
      </ModuleHeader>
      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, email, role, or class"
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => void usersQuery.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.uid || item.id || item.email || `user-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                title="No profiles found"
                body="Adjust search terms or refresh this module."
              />
            )
          }
          refreshControl={
            <RefreshControl
              tintColor={colors.ai}
              refreshing={usersQuery.isRefetching}
              onRefresh={() => void usersQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Pill label={roleOf(item)} tone={item.status === 'inactive' ? 'red' : 'blue'} />
              <Text style={styles.cardTitle}>{item.displayName || 'Unnamed user'}</Text>
              <Text style={styles.cardContent}>{item.email || 'No email on profile'}</Text>
              <View style={styles.metaGrid}>
                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Class</Text>
                  <Text style={styles.metaValue}>
                    {item.classId || item.classIds?.join(', ') || 'N/A'}
                  </Text>
                </View>
                <View style={styles.metaBox}>
                  <Text style={styles.metaLabel}>Modules</Text>
                  <Text style={styles.metaValue}>{item.assignedModules?.length || 'Default'}</Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const moduleLabels: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  aiAssistant: 'AI Assistant',
  announcements: 'Announcements',
  attendance: 'Attendance',
  assignments: 'Assignments',
  chat: 'Chat',
  library: 'Library',
  fees: 'Fees',
  performance: 'Performance',
  students: 'Students',
  teachers: 'Teachers',
  allUsers: 'All Users',
  parentPortal: 'Parent Portal',
  auditLogs: 'Audit Logs',
  settings: 'Settings',
};

const styles = StyleSheet.create({
  aiInsightBody: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  aiInsightCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  aiInsightEyebrow: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardContent: {
    color: colors.whiteSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  cardDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  featuredAnnouncement: {
    backgroundColor: '#132142',
    borderColor: '#2950b8',
  },
  flex: {
    flex: 1,
  },
  heroPanel: {
    backgroundColor: '#081225',
    borderColor: '#2a3650',
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 22,
  },
  heroSubtitle: {
    color: colors.whiteSoft,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 10,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 40,
    marginTop: 16,
  },
  linkText: {
    color: '#5ea0ff',
    fontSize: 13,
    fontWeight: '900',
  },
  listContent: {
    paddingBottom: 20,
  },
  metaBox: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  panelHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  panelHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  panelSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  quickActionBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  quickActionCard: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 138,
    padding: 14,
    width: '48%',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  quickActionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  screenContent: {
    paddingBottom: 24,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 2,
  },
  syncedText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  workspacePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  workspacePillText: {
    color: colors.whiteSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
