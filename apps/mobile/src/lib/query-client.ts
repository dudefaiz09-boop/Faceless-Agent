import { AppState } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });

  return () => {
    subscription.remove();
  };
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 30,
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
  },
});
