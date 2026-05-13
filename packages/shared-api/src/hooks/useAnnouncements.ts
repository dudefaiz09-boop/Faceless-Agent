import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnnouncementsService } from '../services/announcements.js';
import { AnnouncementInput } from '@educonnect/shared';

export const ANNOUNCEMENTS_QUERY_KEY = ['announcements'];

export function useAnnouncements(service: AnnouncementsService, schoolId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = schoolId ? [...ANNOUNCEMENTS_QUERY_KEY, schoolId] : ANNOUNCEMENTS_QUERY_KEY;

  const query = useQuery({
    queryKey,
    queryFn: () => service.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementInput) => service.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    // Optimistic Update Example
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) =>
        old?.filter((a: any) => a.id !== id)
      );
      return { previous };
    },
    onError: (err, id, context: any) => {
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
