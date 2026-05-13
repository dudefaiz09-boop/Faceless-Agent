import { useMutation, useQueryClient, DefaultError } from '@tanstack/react-query';

export interface OptimisticOptions<TData, TVariables> {
  queryKey: string[];
  mutationFn: (vars: TVariables) => Promise<TData>;
  /**
   * Function to optimistically update the cache BEFORE the network request finishes.
   */
  onMutateUpdate: (oldData: TData[] | undefined, newVars: TVariables) => TData[];
}

/**
 * OPTIMISTIC MUTATION HOOK
 * Enforces zero-latency UI updates by artificially mutating the React Query cache.
 * Automatically rolls back the local cache if the backend API or Firestore update fails.
 */
export function useOptimisticMutation<TData, TVariables, TError = DefaultError>({
  queryKey,
  mutationFn,
  onMutateUpdate,
}: OptimisticOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, { previousData: TData[] | undefined }>({
    mutationFn,
    onMutate: async (newVars) => {
      // 1. Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // 2. Snapshot the previous value for rollback purposes
      const previousData = queryClient.getQueryData<TData[]>(queryKey);

      // 3. Optimistically update to the new value
      queryClient.setQueryData<TData[]>(queryKey, (old) => onMutateUpdate(old, newVars));

      // 4. Return context object with snapshotted value
      return { previousData };
    },
    onError: (err, newVars, context) => {
      // 5. If the mutation fails, rollback to the previous value
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error('[OptimisticMutation] Rollback triggered due to error:', err);
    },
    onSettled: () => {
      // 6. Invalidate query to guarantee strict consistency with the database.
      // (Though if useRealtimeSync is active, this happens automatically via onSnapshot)
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
