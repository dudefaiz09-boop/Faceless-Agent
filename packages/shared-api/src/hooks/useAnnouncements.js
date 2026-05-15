import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
export const ANNOUNCEMENTS_QUERY_KEY = ['announcements'];
export function useAnnouncements(service, schoolId) {
  const queryClient = useQueryClient();
  const queryKey = schoolId ? [...ANNOUNCEMENTS_QUERY_KEY, schoolId] : ANNOUNCEMENTS_QUERY_KEY;
  const query = useQuery({
    queryKey,
    queryFn: () => service.getAll(),
  });
  const createMutation = useMutation({
    mutationFn: (data) => service.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    // Optimistic Update Example
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => old?.filter((a) => a.id !== id));
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(queryKey, context.previous);
    },
  });
  return {
    ...query,
    createAnnouncement: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteAnnouncement: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
//# sourceMappingURL=useAnnouncements.js.map
