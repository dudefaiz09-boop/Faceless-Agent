import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { assignmentsService } from '../lib/api-client';
import { useAssignments } from '@educonnect/shared-api';
import { useAuth } from '../contexts/AuthContext';

export const AssignmentsScreen = () => {
  const { schoolId } = useAuth();
  const {
    data: assignments = [],
    isLoading,
    refetch,
    isRefetching,
  } = useAssignments(assignmentsService, schoolId);

  const onRefresh = () => {
    refetch();
  };

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id!}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.footer}>
              <Text style={styles.dueDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
              <Text style={styles.points}>{item.pointsPossible} pts</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No assignments found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  dueDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  points: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
});
