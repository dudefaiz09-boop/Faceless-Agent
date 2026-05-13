import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AssignmentsService } from '../services/assignments.js';
import { Assignment } from '@educonnect/shared-education';

export const ASSIGNMENTS_QUERY_KEY = ['assignments'];

export function useAssignments(service: AssignmentsService, classId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = classId ? [...ASSIGNMENTS_QUERY_KEY, classId] : ASSIGNMENTS_QUERY_KEY;

  const query = useQuery({
    queryKey,
    queryFn: () => service.getAssignments(classId || undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Assignment>) => service.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY });
    },
  });

  return {
    ...query,
    createAssignment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function useAssignmentSubmissions(service: AssignmentsService, assignmentId: string) {
  return useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: () => service.getSubmissions(assignmentId),
    enabled: !!assignmentId,
  });
}
