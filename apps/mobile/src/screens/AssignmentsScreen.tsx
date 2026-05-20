import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useAssignments } from '@educonnect/shared-api';
import { useAuth } from '../contexts/AuthContext';
import { assignmentsService } from '../lib/api-client';

const colors = {
  background: '#020617',
  border: '#24324a',
  card: '#0f172a',
  cardSoft: '#111c33',
  danger: '#f87171',
  muted: '#94a3b8',
  primary: '#2563eb',
  primarySoft: '#172554',
  text: '#f8fafc',
};

export const AssignmentsScreen = () => {
  const { schoolId } = useAuth();
  const {
    data: assignments = [],
    dataUpdatedAt,
    error,
    isError,
    isLoading,
    refetch,
    isRefetching,
  } = useAssignments(assignmentsService, schoolId);

  if (isLoading && !isRefetching) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonShort} />
        </View>
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.errorTitle}>Assignments unavailable</Text>
        <Text style={styles.emptyText}>
          {(error as Error)?.message || 'Please check your connection and try again.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={assignments}
      keyExtractor={(item) => item.id!}
      contentContainerStyle={styles.container}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      refreshControl={
        <RefreshControl
          tintColor="#67e8f9"
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{item.status}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
          </View>
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.dueDate}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>
            <Text style={styles.points}>{item.pointsPossible} pts</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No assignments found</Text>
          <Text style={styles.emptyText}>New class work will show up here when available.</Text>
        </View>
      }
      ListFooterComponent={
        assignments.length > 0 ? (
          <Text style={styles.syncedText}>
            Last synced{' '}
            {dataUpdatedAt
              ? new Date(dataUpdatedAt).toLocaleString([], {
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  month: 'short',
                })
              : 'Not synced yet'}
          </Text>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    marginBottom: 10,
  },
  container: {
    paddingBottom: 12,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  dueDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 26,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  points: {
    color: '#8bb7ff',
    fontSize: 12,
    fontWeight: '900',
  },
  retryButton: {
    borderColor: '#4f8cff',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  retryButtonText: {
    color: '#8bb7ff',
    fontWeight: '900',
  },
  skeletonCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  skeletonLine: {
    backgroundColor: '#1c2842',
    borderRadius: 8,
    height: 12,
    marginTop: 12,
    width: '90%',
  },
  skeletonShort: {
    backgroundColor: '#1c2842',
    borderRadius: 8,
    height: 12,
    marginTop: 12,
    width: '52%',
  },
  skeletonTitle: {
    backgroundColor: '#31415f',
    borderRadius: 8,
    height: 18,
    width: '58%',
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    color: '#67e8f9',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  syncedText: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
});
