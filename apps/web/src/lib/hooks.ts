import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

type ApiDataResponse<T> = T | { success?: boolean; data?: T };

function unwrapApiData<T>(response: ApiDataResponse<T>) {
  return typeof response === 'object' && response !== null && 'data' in response && response.data
    ? response.data
    : (response as T);
}

/**
 * Custom hook to debounce a value.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<{ stats: unknown[]; trends: unknown[] }>(
        '/api/dashboard/stats'
      );
      return res;
    },
    staleTime: 30_000,
    retry: 2,
  });
}

export function useAttendanceTrend(page = 1) {
  return useQuery({
    queryKey: ['dashboard', 'attendance-trend', page],
    queryFn: async () => {
      const res = await apiClient.get<{
        data: Array<{ label: string; value: number }>;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasMore: boolean;
        };
      }>(`/api/dashboard/attendance-trend?page=${page}&limit=100`);
      return { data: res.data, pagination: res.pagination };
    },
    staleTime: 60_000,
    retry: 2,
  });
}

export function usePerformanceTrend(page = 1) {
  return useQuery({
    queryKey: ['dashboard', 'performance-trend', page],
    queryFn: async () => {
      const res = await apiClient.get<{
        data: Array<{ label: string; value: number }>;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasMore: boolean;
        };
      }>(`/api/dashboard/performance-trend?page=${page}&limit=100`);
      return { data: res.data, pagination: res.pagination };
    },
    staleTime: 60_000,
    retry: 2,
  });
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useChatbot() {
  const queryClient = useQueryClient();

  const chatMutation = useMutation({
    mutationFn: (query: string) =>
      apiClient.request('/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }),
    onSuccess: () => {
      // Invalidate chatbot history if we were fetching it
      queryClient.invalidateQueries({ queryKey: ['chatbot-history'] });
    },
  });

  return {
    askChatbot: chatMutation.mutateAsync,
    isAsking: chatMutation.isPending,
    error: chatMutation.error,
  };
}

export function useStudentProfile(uid?: string) {
  return useQuery({
    queryKey: ['student', uid],
    queryFn: async () => unwrapApiData(await apiClient.request(`/api/students/${uid}`)),
    enabled: !!uid,
  });
}
