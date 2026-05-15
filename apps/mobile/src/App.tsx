import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { useAnnouncements } from '@educonnect/shared-api';
import { announcementsService } from './lib/api-client';
import { AssignmentsScreen } from './screens/AssignmentsScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AnnouncementsList = () => {
  const { data: announcements = [], isLoading } = useAnnouncements(announcementsService);

  if (isLoading) {
    return <ActivityIndicator size="small" color="#2563eb" />;
  }

  return (
    <FlatList
      data={announcements}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardContent}>{item.content}</Text>
          <Text style={styles.cardDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
          </Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No announcements yet.</Text>}
    />
  );
};

const AppContent = () => {
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'announcements' | 'assignments'>('announcements');

  const handleLogin = async () => {
    setError('');
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <Text style={styles.title}>EduConnect</Text>
          <Text style={styles.subtitle}>Mobile Portal</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Hello,</Text>
          <Text style={styles.userName}>{user.displayName || user.email}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'announcements' && styles.activeTab]}
            onPress={() => setActiveTab('announcements')}
          >
            <Text style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>
              News
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'assignments' && styles.activeTab]}
            onPress={() => setActiveTab('assignments')}
          >
            <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>
              Work
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'announcements' ? (
          <>
            <Text style={styles.sectionTitle}>Latest Announcements</Text>
            <AnnouncementsList />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>My Assignments</Text>
            <AssignmentsScreen />
          </>
        )}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContainer: {
    flex: 1,
    padding: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  error: {
    color: '#ef4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  welcome: {
    fontSize: 14,
    color: '#64748b',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#2563eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'right',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
  },
});

export default App;
