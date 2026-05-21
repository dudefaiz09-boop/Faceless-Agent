import React, { Component, useEffect, useMemo, useState, type ErrorInfo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { canAccessModule, type ModuleKey } from '@educonnect/shared';
import { mobileConfigIssues } from './config/env';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { queryClient } from './lib/query-client';
import { supabase, supabaseConfigured } from './lib/supabase';
import { ChatScreen } from './screens/ChatScreen';
import {
  AnnouncementsScreen,
  AssignmentsModuleScreen,
  DashboardScreen,
  DirectoryScreen,
} from './screens/HomeScreens';
import {
  AttendanceScreen,
  FeesScreen,
  LibraryScreen,
  ParentPortalScreen,
  PerformanceScreen,
} from './screens/OperationalScreens';
import { colors, formatDate } from './theme';

type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  group: 'primary' | 'academic' | 'operations' | 'admin';
};

const modules: ModuleDefinition[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    description: 'Role-specific overview and quick actions.',
    group: 'primary',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    shortLabel: 'News',
    description: 'School updates and targeted broadcasts.',
    group: 'primary',
  },
  {
    key: 'attendance',
    label: 'Attendance',
    shortLabel: 'Attend',
    description: 'Daily records, history, and class summaries.',
    group: 'operations',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    shortLabel: 'Work',
    description: 'Class work, due dates, and submissions.',
    group: 'primary',
  },
  {
    key: 'chat',
    label: 'Chat',
    shortLabel: 'Chat',
    description: 'Role-aware school conversations.',
    group: 'primary',
  },
  {
    key: 'library',
    label: 'Library',
    shortLabel: 'Library',
    description: 'Digital resources and borrowing status.',
    group: 'academic',
  },
  {
    key: 'fees',
    label: 'Fees',
    shortLabel: 'Fees',
    description: 'Fee summaries and payment status.',
    group: 'operations',
  },
  {
    key: 'performance',
    label: 'Performance',
    shortLabel: 'Scores',
    description: 'Academic analytics and records.',
    group: 'academic',
  },
  {
    key: 'parentPortal',
    label: 'Parent Portal',
    shortLabel: 'Parent',
    description: 'Linked child summaries.',
    group: 'operations',
  },
  {
    key: 'students',
    label: 'Students',
    shortLabel: 'Students',
    description: 'Student registry and classes.',
    group: 'admin',
  },
  {
    key: 'teachers',
    label: 'Teachers',
    shortLabel: 'Teachers',
    description: 'Faculty registry and assignments.',
    group: 'admin',
  },
  {
    key: 'allUsers',
    label: 'All Users',
    shortLabel: 'Users',
    description: 'Roles, status, and module access.',
    group: 'admin',
  },
];

const moduleGroupLabels: Record<ModuleDefinition['group'], string> = {
  primary: 'Primary',
  academic: 'Academic',
  operations: 'Operations',
  admin: 'Administration',
};

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

function parseAuthLink(url: string) {
  const [base, fragment = ''] = url.split('#');
  const query = base.split('?')[1] || '';
  const params = new URLSearchParams(fragment || query);
  return {
    isReset: url.includes('/auth/reset-password') || url.includes('type=recovery'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
}

class MobileErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[MobileErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.configTitle}>Something went wrong</Text>
          <Text style={styles.configBody}>
            EduConnect recovered from an unexpected screen error. Restart the app or sign in again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
}

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

const ConfigScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.centered}>
      <Text style={styles.configTitle}>App Not Configured</Text>
      <Text style={styles.configBody}>
        This APK was built without the required public mobile configuration.
      </Text>
      <View style={styles.configList}>
        {mobileConfigIssues.map((issue) => (
          <Text key={issue.name} style={styles.configItem}>
            {issue.name}: {issue.message}
          </Text>
        ))}
      </View>
      <Text style={styles.configBody}>
        Add SUPABASE_URL, SUPABASE_ANON_KEY, and API_BASE_URL in apps/mobile/.env, then rebuild.
        VITE_* aliases are also supported for migration compatibility.
      </Text>
    </View>
  </SafeAreaView>
);

const AuthScreen = ({
  mode,
  onModeChange,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) => {
  const { login, register, sendPasswordReset, updatePassword } = useAuth();
  const { isOffline, lastCheckedAt } = useNetworkStatus();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const titles: Record<AuthMode, { title: string; subtitle: string; action: string }> = {
    login: {
      title: 'Welcome Back',
      subtitle: 'Sign in to access your EduConnect workspace.',
      action: 'Sign In',
    },
    register: {
      title: 'Create Account',
      subtitle: 'Register with your school-provided email address.',
      action: 'Create Account',
    },
    forgot: {
      title: 'Reset Password',
      subtitle: 'Enter your account email and we will send a secure reset link.',
      action: 'Send Reset Link',
    },
    reset: {
      title: 'Set New Password',
      subtitle: 'Choose a new password for this EduConnect account.',
      action: 'Update Password',
    },
  };

  const validate = () => {
    if (mode !== 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Enter a valid email address.';
    }
    if (mode === 'register' && displayName.trim().length < 2) {
      return 'Enter your full name.';
    }
    if (mode !== 'forgot' && password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else if (mode === 'register') {
        await register({ displayName: displayName.trim(), email: email.trim(), password });
        setMessage('Account created. Check your inbox if your school requires email confirmation.');
        onModeChange('login');
      } else if (mode === 'forgot') {
        await sendPasswordReset(email.trim());
        setMessage('Reset email sent. Open the link on this device to continue.');
      } else {
        await updatePassword(password);
        setMessage('Password updated. You can continue using EduConnect.');
        onModeChange('login');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>AI ERP</Text>
        </View>
        <Text style={styles.title}>{titles[mode].title}</Text>
        <Text style={styles.subtitle}>{titles[mode].subtitle}</Text>

        <View style={styles.loginPanel}>
          {mode === 'register' && (
            <TextInput
              autoComplete="name"
              onChangeText={setDisplayName}
              placeholder="Full name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={displayName}
            />
          )}
          {mode !== 'reset' && (
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={email}
            />
          )}
          {mode !== 'forgot' && (
            <TextInput
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChangeText={setPassword}
              placeholder={mode === 'reset' ? 'New password' : 'Password'}
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          )}
          {(mode === 'register' || mode === 'reset') && (
            <TextInput
              autoComplete="new-password"
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          <OfflineBanner isOffline={isOffline} lastCheckedAt={lastCheckedAt} />

          <TouchableOpacity
            disabled={submitting || isOffline}
            onPress={handleSubmit}
            style={[styles.button, (submitting || isOffline) && styles.disabledButton]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>{titles[mode].action}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.authLinks}>
            {mode !== 'login' && (
              <TouchableOpacity onPress={() => onModeChange('login')}>
                <Text style={styles.authLinkText}>Back to sign in</Text>
              </TouchableOpacity>
            )}
            {mode === 'login' && (
              <>
                <TouchableOpacity onPress={() => onModeChange('forgot')}>
                  <Text style={styles.authLinkText}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onModeChange('register')}>
                  <Text style={styles.authLinkText}>Create account</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const MoreScreen = ({
  modulesForUser,
  onOpenModule,
  onOpenProfile,
  onOpenSettings,
  onSignOut,
  signingOut,
}: {
  modulesForUser: ModuleDefinition[];
  onOpenModule: (module: ModuleKey) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) => {
  const grouped = useMemo(
    () =>
      (['primary', 'academic', 'operations', 'admin'] as ModuleDefinition['group'][]).map(
        (group) => ({
          group,
          items: modulesForUser.filter((item) => item.group === group),
        })
      ),
    [modulesForUser]
  );

  return (
    <ScrollView contentContainerStyle={styles.moreContent}>
      <Text style={styles.sectionTitle}>More</Text>
      <Text style={styles.sectionSubtitle}>All modules available to your role.</Text>
      {grouped
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <View key={section.group} style={styles.moduleGroup}>
            <Text style={styles.groupLabel}>{moduleGroupLabels[section.group]}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => onOpenModule(item.key)}
                style={styles.moduleRow}
              >
                <View style={styles.moduleIcon}>
                  <Text style={styles.moduleIconText}>{item.shortLabel.slice(0, 1)}</Text>
                </View>
                <View style={styles.moduleRowText}>
                  <Text style={styles.moduleTitle}>{item.label}</Text>
                  <Text style={styles.moduleDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      <View style={styles.moduleGroup}>
        <Text style={styles.groupLabel}>Account</Text>
        <TouchableOpacity onPress={onOpenProfile} style={styles.moduleRow}>
          <View style={styles.moduleIcon}>
            <Text style={styles.moduleIconText}>P</Text>
          </View>
          <View style={styles.moduleRowText}>
            <Text style={styles.moduleTitle}>Profile</Text>
            <Text style={styles.moduleDescription}>Your role, school, and contact details.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenSettings} style={styles.moduleRow}>
          <View style={styles.moduleIcon}>
            <Text style={styles.moduleIconText}>S</Text>
          </View>
          <View style={styles.moduleRowText}>
            <Text style={styles.moduleTitle}>Settings</Text>
            <Text style={styles.moduleDescription}>Theme preference and app build information.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSignOut} disabled={signingOut} style={styles.moduleRow}>
          <View style={[styles.moduleIcon, styles.signOutIcon]}>
            <Text style={styles.signOutIconText}>X</Text>
          </View>
          <View style={styles.moduleRowText}>
            <Text style={styles.moduleTitle}>{signingOut ? 'Signing out...' : 'Sign out'}</Text>
            <Text style={styles.moduleDescription}>End this session on the device.</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const ProfileScreen = () => {
  const { user, role, roles, schoolId, classId, linkedStudentIds, assignedModules } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.moreContent}>
      <Text style={styles.sectionTitle}>Profile</Text>
      <Text style={styles.sectionSubtitle}>Account and tenant context currently loaded.</Text>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>
          {(user?.displayName || user?.email || 'EduConnect').slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.profilePanel}>
        <Text style={styles.profileName}>{user?.displayName || 'EduConnect user'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'No email on profile'}</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Role</Text>
            <Text style={styles.metaValue}>{role}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>School</Text>
            <Text style={styles.metaValue}>{schoolId || 'Not selected'}</Text>
          </View>
        </View>
        <View style={styles.metaGrid}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Class</Text>
            <Text style={styles.metaValue}>{classId || 'N/A'}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Children</Text>
            <Text style={styles.metaValue}>{linkedStudentIds.length}</Text>
          </View>
        </View>
        <Text style={styles.profileCaption}>
          Roles: {roles.length ? roles.join(', ') : 'Default'} | Modules:{' '}
          {assignedModules.length ? assignedModules.length : 'Default'}
        </Text>
      </View>
    </ScrollView>
  );
};

const SettingsScreen = () => (
  <ScrollView contentContainerStyle={styles.moreContent}>
    <Text style={styles.sectionTitle}>Settings</Text>
    <Text style={styles.sectionSubtitle}>Device-ready app preferences and build details.</Text>
    <View style={styles.profilePanel}>
      <View style={styles.settingsRow}>
        <View>
          <Text style={styles.moduleTitle}>Theme</Text>
          <Text style={styles.moduleDescription}>Follows the current EduConnect dark interface.</Text>
        </View>
        <View style={styles.settingsBadge}>
          <Text style={styles.settingsBadgeText}>Dark</Text>
        </View>
      </View>
      <View style={styles.settingsRow}>
        <View>
          <Text style={styles.moduleTitle}>App version</Text>
          <Text style={styles.moduleDescription}>EduConnect 1.0</Text>
        </View>
      </View>
      <View style={styles.settingsRow}>
        <View>
          <Text style={styles.moduleTitle}>Environment</Text>
          <Text style={styles.moduleDescription}>
            API and Supabase public config are baked into each native build.
          </Text>
        </View>
      </View>
    </View>
  </ScrollView>
);

const ModuleContent = ({
  activeModule,
  onOpenModule,
  modulesForUser,
  onOpenProfile,
  onOpenSettings,
  onSignOut,
  signingOut,
}: {
  activeModule: ModuleKey | 'more' | 'profile' | 'settings';
  onOpenModule: (module: ModuleKey) => void;
  modulesForUser: ModuleDefinition[];
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) => {
  switch (activeModule) {
    case 'dashboard':
      return <DashboardScreen onOpenModule={onOpenModule} />;
    case 'announcements':
      return <AnnouncementsScreen />;
    case 'attendance':
      return <AttendanceScreen />;
    case 'assignments':
      return <AssignmentsModuleScreen />;
    case 'chat':
      return <ChatScreen />;
    case 'library':
      return <LibraryScreen />;
    case 'fees':
      return <FeesScreen />;
    case 'performance':
      return <PerformanceScreen />;
    case 'parentPortal':
      return <ParentPortalScreen />;
    case 'students':
      return <DirectoryScreen type="student" />;
    case 'teachers':
      return <DirectoryScreen type="teacher" />;
    case 'allUsers':
      return <DirectoryScreen type="all" />;
    case 'profile':
      return <ProfileScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'more':
      return (
        <MoreScreen
          modulesForUser={modulesForUser}
          onOpenModule={onOpenModule}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
      );
    default:
      return <DashboardScreen onOpenModule={onOpenModule} />;
  }
};

const AppContent = () => {
  const { user, loading, logout, role, roles, schoolId, assignedModules } = useAuth();
  const { isOffline, lastCheckedAt } = useNetworkStatus();
  const [activeModule, setActiveModule] = useState<ModuleKey | 'more' | 'profile' | 'settings'>(
    'dashboard'
  );
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const link = parseAuthLink(url);
      if (link.accessToken && link.refreshToken) {
        void supabase.auth.setSession({
          access_token: link.accessToken,
          refresh_token: link.refreshToken,
        });
      }
      if (link.isReset) setAuthMode('reset');
    };

    Linking.getInitialURL().then(handleUrl).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  const modulesForUser = useMemo(
    () => modules.filter((item) => canAccessModule(role, item.key, assignedModules)),
    [assignedModules, role]
  );

  const resolvedActiveModule =
    activeModule === 'more' ||
    activeModule === 'profile' ||
    activeModule === 'settings' ||
    modulesForUser.some((item) => item.key === activeModule)
      ? activeModule
      : modulesForUser[0]?.key || 'dashboard';

  if (!supabaseConfigured) return <ConfigScreen />;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.ai} />
          <Text style={styles.loadingText}>Opening EduConnect</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return <AuthScreen mode={authMode} onModeChange={setAuthMode} />;

  const primaryTabOrder: ModuleKey[] = ['dashboard', 'announcements', 'assignments', 'chat'];
  const primaryTabs = primaryTabOrder
    .map((key) => modulesForUser.find((item) => item.key === key))
    .filter((item): item is ModuleDefinition => Boolean(item));
  const bottomTabs: Array<ModuleDefinition | { key: 'more'; shortLabel: string; label: string }> = [
    ...primaryTabs,
    { key: 'more', shortLabel: 'More', label: 'More' },
  ];

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner isOffline={isOffline} lastCheckedAt={lastCheckedAt} />
      <View style={styles.topBar}>
        <View style={styles.brandBlock}>
          <Text style={styles.brandTitle}>EduConnect</Text>
          <Text style={styles.brandSubtitle}>
            {schoolId ? `School ${schoolId}` : 'AI ERP'} - {role}
          </Text>
        </View>
        <View style={styles.userPill}>
          <View style={styles.userTextBlock}>
            <Text style={styles.userName}>{user.displayName || user.email}</Text>
            <Text style={styles.roleText}>{roles.length ? roles.join(' / ') : role}</Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={signingOut}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>{signingOut ? '...' : 'Sign out'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <ModuleContent
          activeModule={resolvedActiveModule}
          onOpenModule={setActiveModule}
          modulesForUser={modulesForUser}
          onOpenProfile={() => setActiveModule('profile')}
          onOpenSettings={() => setActiveModule('settings')}
          onSignOut={handleLogout}
          signingOut={signingOut}
        />
      </View>

      <View style={styles.bottomTabs}>
        <FlatList
          horizontal
          data={bottomTabs}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.bottomTabList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isActive = resolvedActiveModule === item.key;
            return (
              <TouchableOpacity
                onPress={() => setActiveModule(item.key as ModuleKey | 'more')}
                style={[styles.bottomTab, isActive && styles.activeBottomTab]}
              >
                <Text style={[styles.bottomTabText, isActive && styles.activeBottomTabText]}>
                  {item.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const App = () => (
  <MobileErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  </MobileErrorBoundary>
);

const styles = StyleSheet.create({
  activeBottomTab: {
    backgroundColor: colors.primary,
  },
  activeBottomTabText: {
    color: colors.text,
  },
  bottomTab: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 46,
    minWidth: 82,
    paddingHorizontal: 12,
  },
  bottomTabList: {
    paddingHorizontal: 14,
  },
  bottomTabText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  bottomTabs: {
    backgroundColor: '#07101f',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  brandBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: '#29418a',
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  brandBadgeText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
  },
  brandSubtitle: {
    color: '#4f8cff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  brandTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  configBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  configItem: {
    color: '#fecaca',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  configList: {
    alignSelf: 'stretch',
    backgroundColor: colors.dangerSoft,
    borderColor: '#7f1d1d',
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: 18,
    padding: 16,
  },
  configTitle: {
    color: colors.danger,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  disabledButton: {
    opacity: 0.55,
  },
  error: {
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
  authLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginTop: 18,
  },
  authLinkText: {
    color: '#8bb7ff',
    fontSize: 13,
    fontWeight: '900',
  },
  groupLabel: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#091226',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 14,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  loadingText: {
    color: colors.muted,
    marginTop: 12,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loginPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 22,
    padding: 20,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoutText: {
    color: '#fda4af',
    fontSize: 12,
    fontWeight: '900',
  },
  moduleDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  moduleGroup: {
    marginTop: 22,
  },
  moduleIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  moduleIconText: {
    color: colors.ai,
    fontSize: 16,
    fontWeight: '900',
  },
  moduleRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  moduleRowText: {
    flex: 1,
  },
  moduleTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
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
  moreContent: {
    paddingBottom: 30,
  },
  offlineBanner: {
    backgroundColor: colors.warningSoft,
    borderBottomColor: '#7c5a12',
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  offlineBody: {
    color: colors.warning,
    fontSize: 12,
  },
  offlineTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '900',
  },
  roleText: {
    color: colors.ai,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  profileAvatar: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginTop: 18,
    width: 56,
  },
  profileAvatarText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  profileCaption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 16,
  },
  profileEmail: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  profileName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  profilePanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  settingsBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  settingsBadgeText: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
  },
  settingsRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  signOutIcon: {
    backgroundColor: colors.dangerSoft,
  },
  signOutIconText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
  },
  successText: {
    color: colors.success,
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  topBar: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  userPill: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    maxWidth: '58%',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  userTextBlock: {
    flexShrink: 1,
  },
});

export default App;
