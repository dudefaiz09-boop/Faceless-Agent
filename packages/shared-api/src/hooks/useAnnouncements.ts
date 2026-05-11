import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnnouncementsService } from '../services/announcements.js';
import { AnnouncementInput } from '@educonnect/shared';

export const ANNOUNCEMENTS_QUERY_KEY = ['announcements'];

export function useAnnouncements(service: AnnouncementsService) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ANNOUNCEMENTS_QUERY_KEY,
    queryFn: () => service.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementInput) => service.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
    },
    // Optimistic Update Example
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
      const previous = queryClient.getQueryData(ANNOUNCEMENTS_QUERY_KEY);
      queryClient.setQueryData(ANNOUNCEMENTS_QUERY_KEY, (old: any) => 
        old?.filter((a: any) => a.id !== id)
      );
      return { previous };
    },
    onError: (err, id, context: any) => {
      queryClient.setQueryData(ANNOUNCEMENTS_QUERY_KEY, context.previous);
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
