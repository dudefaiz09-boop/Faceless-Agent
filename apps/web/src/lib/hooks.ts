import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

/**
 * Custom hook to debounce a value.
 */
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
    queryFn: () => apiClient.request(`/api/students/${uid}`),
    enabled: !!uid,
  });
}
