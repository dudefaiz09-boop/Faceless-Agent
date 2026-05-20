import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAnnouncements } from '@educonnect/shared-api';
import { AssignmentsScreen } from './screens/AssignmentsScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { mobileConfigIssues } from './config/env';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { announcementsService } from './lib/api-client';
import { queryClient } from './lib/query-client';
import { supabaseConfigured } from './lib/supabase';

type AppTab = 'dashboard' | 'announcements' | 'assignments';

const lightColors = {
  background: '#f8fafc',
  border: '#dbe4ee',
  card: '#ffffff',
  danger: '#b91c1c',
  muted: '#64748b',
  primary: '#2563eb',
  primarySoft: '#dbeafe',
  success: '#15803d',
  successSoft: '#dcfce7',
  text: '#0f172a',
  warning: '#b45309',
  warningSoft: '#fef3c7',
};

const darkColors = {
  background: '#111827',
  border: '#334155',
  card: '#1f2937',
  danger: '#f87171',
  muted: '#cbd5e1',
  primary: '#60a5fa',
  primarySoft: '#1e3a8a',
  success: '#4ade80',
  successSoft: '#14532d',
  text: '#f8fafc',
  warning: '#fbbf24',
  warningSoft: '#78350f',
};

function formatDate(value?: string | number | Date | null) {
  if (!value) return 'Not synced yet';
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

const SkeletonCard = ({ compact = false }: { compact?: boolean }) => (
  <View style={[styles.card, compact && styles.compactCard]}>
    <View style={styles.skeletonTitle} />
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, styles.skeletonShort]} />
  </View>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyBody}>{body}</Text>
  </View>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={styles.emptyState}>
    <Text style={styles.errorTitle}>Could not load data</Text>
    <Text style={styles.emptyBody}>{message}</Text>
    <TouchableOpacity style={styles.secondaryButton} onPress={onRetry}>
      <Text style={styles.secondaryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

const OfflineBanner = ({
  isOffline,
  lastCheckedAt,
}: {
  isOffline: boolean;
  lastCheckedAt: number | null;
}) => {
  if (!isOffline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineTitle}>Offline mode</Text>
      <Text style={styles.offlineBody}>Last checked {formatDate(lastCheckedAt)}</Text>
    </View>
  );
};

const AnnouncementsList = ({ schoolId }: { schoolId: string | null }) => {
  const {
    data: announcements = [],
    dataUpdatedAt,
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useAnnouncements(announcementsService, schoolId);

  if (isLoading && !isRefetching) {
    return (
      <View>
        <SkeletonCard />
        <SkeletonCard compact />
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={(error as Error)?.message || 'Announcements are temporarily unavailable.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <FlatList
      data={announcements}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState title="No announcements" body="New school updates will appear here." />
      }
      ListFooterComponent={
        announcements.length > 0 ? (
          <Text style={styles.syncedText}>Last synced {formatDate(dataUpdatedAt)}</Text>
        ) : null
      }
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>News</Text>
            </View>
          </View>
          <Text style={styles.cardContent}>{item.content}</Text>
          <Text style={styles.cardDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
          </Text>
        </View>
      )}
    />
  );
};

const DemoMetric = ({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'warning';
}) => (
  <View style={styles.metricCard}>
    <Text
      style={[
        styles.metricValue,
        tone === 'success'
          ? styles.successText
          : tone === 'warning'
            ? styles.warningText
            : styles.primaryText,
      ]}
    >
      {value}
    </Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const Dashboard = ({
  onOpenTab,
  schoolId,
}: {
  onOpenTab: (tab: AppTab) => void;
  schoolId: string | null;
}) => {
  const { roles } = useAuth();
  const {
    data: announcements = [],
    dataUpdatedAt: announcementsUpdatedAt,
    refetch: refetchAnnouncements,
  } = useAnnouncements(announcementsService, schoolId);
  const primaryRole = roles[0] || 'student';
  const isParent = roles.includes('parent');
  const isTeacher = roles.includes('teacher');
  const latestAnnouncement = announcements[0];

  const roleLabel = primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1);

  return (
    <ScrollView
      contentContainerStyle={styles.dashboardContent}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetchAnnouncements()} />
      }
    >
      <View style={styles.heroPanel}>
        <View>
          <Text style={styles.heroEyebrow}>{roleLabel} dashboard</Text>
          <Text style={styles.heroTitle}>Today at a glance</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>Live</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <DemoMetric label="Announcements" value={`${announcements.length}`} />
        <DemoMetric label="Attendance" value="Quick" tone="success" />
        <DemoMetric label="Fees" value="Clear" tone="warning" />
        <DemoMetric label="Library" value="Due" />
      </View>

      {isParent ? (
        <View style={styles.switcher}>
          <Text style={styles.switcherLabel}>Child</Text>
          <Text style={styles.switcherValue}>All children</Text>
        </View>
      ) : null}

      {isTeacher ? (
        <View style={styles.switcher}>
          <Text style={styles.switcherLabel}>Class</Text>
          <Text style={styles.switcherValue}>Current class</Text>
        </View>
      ) : null}

      <View style={styles.quickActionRow}>
        <TouchableOpacity style={styles.quickAction} onPress={() => onOpenTab('assignments')}>
          <Text style={styles.quickActionTitle}>Assignments</Text>
          <Text style={styles.quickActionBody}>Upcoming work</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => onOpenTab('announcements')}>
          <Text style={styles.quickActionTitle}>Announcements</Text>
          <Text style={styles.quickActionBody}>Recent updates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent announcement</Text>
        <Text style={styles.cardContent}>
          {latestAnnouncement?.title || 'No recent announcement available.'}
        </Text>
        <Text style={styles.syncedText}>Last synced {formatDate(announcementsUpdatedAt)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Performance snapshot</Text>
        <Text style={styles.cardContent}>
          Attendance, assignment, library, and fee signals are ready for role-specific modules.
        </Text>
      </View>
    </ScrollView>
  );
};

const AppContent = () => {
  const colorScheme = useColorScheme();
  const { user, loading, login, logout, roles, schoolId } = useAuth();
  const { isOffline, lastCheckedAt } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const themedStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      text: { color: colors.text },
      muted: { color: colors.muted },
      card: { backgroundColor: colors.card, borderColor: colors.border },
    }),
    [colors]
  );

  const handleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      setError((err as Error).message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    void logout();
  };

  if (!supabaseConfigured) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]}>
        <View style={styles.centered}>
          <Text style={styles.configTitle}>App Not Configured</Text>
          <Text style={[styles.configBody, themedStyles.muted]}>
            This APK was built without the required public mobile configuration.
          </Text>
          <View style={[styles.configList, themedStyles.card]}>
            {mobileConfigIssues.map((issue) => (
              <Text key={issue.name} style={styles.configItem}>
                {issue.name}: {issue.message}
              </Text>
            ))}
          </View>
          <Text style={[styles.configBody, themedStyles.muted]}>
            Add SUPABASE_URL, SUPABASE_ANON_KEY, and API_BASE_URL, then rebuild.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, themedStyles.muted]}>Opening EduConnect</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]}>
        <View style={styles.loginContainer}>
          <Text style={[styles.title, themedStyles.text]}>EduConnect</Text>
          <Text style={[styles.subtitle, themedStyles.muted]}>Mobile Portal</Text>

          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            style={[styles.input, themedStyles.card, themedStyles.text]}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            style={[styles.input, themedStyles.card, themedStyles.text]}
            value={password}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <OfflineBanner isOffline={isOffline} lastCheckedAt={lastCheckedAt} />

          <TouchableOpacity
            disabled={submitting || isOffline}
            onPress={handleLogin}
            style={[styles.button, (submitting || isOffline) && styles.disabledButton]}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const roleLabel = roles.length ? roles.join(' / ') : 'student';

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]}>
      <OfflineBanner isOffline={isOffline} lastCheckedAt={lastCheckedAt} />
      <View style={[styles.header, themedStyles.card]}>
        <View>
          <Text style={[styles.welcome, themedStyles.muted]}>Hello,</Text>
          <Text style={[styles.userName, themedStyles.text]}>{user.displayName || user.email}</Text>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'dashboard' ? (
          <Dashboard onOpenTab={setActiveTab} schoolId={schoolId} />
        ) : activeTab === 'announcements' ? (
          <>
            <Text style={[styles.sectionTitle, themedStyles.text]}>Latest Announcements</Text>
            <AnnouncementsList schoolId={schoolId} />
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, themedStyles.text]}>My Assignments</Text>
            <AssignmentsScreen />
          </>
        )}
      </View>

      <View style={[styles.bottomTabs, themedStyles.card]}>
        {[
          ['dashboard', 'Home'],
          ['announcements', 'News'],
          ['assignments', 'Work'],
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key as AppTab)}
            style={[styles.bottomTab, activeTab === key && styles.activeBottomTab]}
          >
            <Text style={[styles.bottomTabText, activeTab === key && styles.activeBottomTabText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </QueryClientProvider>
);

const styles = StyleSheet.create({
  activeBottomTab: {
    backgroundColor: lightColors.primarySoft,
  },
  activeBottomTabText: {
    color: lightColors.primary,
  },
  badge: {
    backgroundColor: lightColors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: lightColors.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bottomTab: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  bottomTabText: {
    color: lightColors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomTabs: {
    borderTopColor: lightColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: lightColors.primary,
    borderRadius: 8,
    marginTop: 10,
    minHeight: 52,
    justifyContent: 'center',
    padding: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: lightColors.card,
    borderColor: lightColors.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardContent: {
    color: lightColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  cardDate: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'right',
  },
  cardHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: lightColors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  compactCard: {
    opacity: 0.75,
  },
  configBody: {
    color: lightColors.muted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  configItem: {
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  configList: {
    alignSelf: 'stretch',
    backgroundColor: 'white',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 18,
    padding: 16,
  },
  configTitle: {
    color: lightColors.danger,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  container: {
    backgroundColor: lightColors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  dashboardContent: {
    paddingBottom: 16,
  },
  disabledButton: {
    opacity: 0.55,
  },
  emptyBody: {
    color: lightColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 28,
  },
  emptyTitle: {
    color: lightColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  error: {
    color: lightColors.danger,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorTitle: {
    color: lightColors.danger,
    fontSize: 16,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    backgroundColor: lightColors.card,
    borderBottomColor: lightColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  heroEyebrow: {
    color: lightColors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroPanel: {
    alignItems: 'center',
    backgroundColor: lightColors.card,
    borderColor: lightColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 18,
  },
  heroTitle: {
    color: lightColors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  input: {
    backgroundColor: 'white',
    borderColor: lightColors.border,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 14,
    minHeight: 52,
    padding: 15,
  },
  loadingText: {
    color: lightColors.muted,
    marginTop: 12,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  logoutButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  logoutText: {
    color: lightColors.danger,
    fontWeight: '700',
  },
  metricCard: {
    backgroundColor: lightColors.card,
    borderColor: lightColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: '47%',
    padding: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricLabel: {
    color: lightColors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  offlineBanner: {
    backgroundColor: lightColors.warningSoft,
    borderBottomColor: '#f59e0b',
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  offlineBody: {
    color: lightColors.warning,
    fontSize: 12,
  },
  offlineTitle: {
    color: lightColors.warning,
    fontSize: 13,
    fontWeight: '900',
  },
  primaryText: {
    color: lightColors.primary,
  },
  quickAction: {
    backgroundColor: lightColors.card,
    borderColor: lightColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 74,
    justifyContent: 'center',
    padding: 14,
  },
  quickActionBody: {
    color: lightColors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickActionTitle: {
    color: lightColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  roleText: {
    color: lightColors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  secondaryButton: {
    borderColor: lightColors.primary,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: lightColors.primary,
    fontWeight: '800',
  },
  sectionTitle: {
    color: lightColors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
  },
  skeletonLine: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    height: 12,
    marginTop: 12,
    width: '92%',
  },
  skeletonShort: {
    width: '64%',
  },
  skeletonTitle: {
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
    height: 18,
    width: '52%',
  },
  statusPill: {
    backgroundColor: lightColors.successSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    color: lightColors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  subtitle: {
    color: lightColors.muted,
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
  },
  successText: {
    color: lightColors.success,
  },
  switcher: {
    alignItems: 'center',
    backgroundColor: lightColors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  switcherLabel: {
    color: lightColors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  switcherValue: {
    color: lightColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  syncedText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 10,
  },
  title: {
    color: lightColors.text,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  userName: {
    color: lightColors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  warningText: {
    color: lightColors.warning,
  },
  welcome: {
    color: lightColors.muted,
    fontSize: 14,
  },
});

export default App;
