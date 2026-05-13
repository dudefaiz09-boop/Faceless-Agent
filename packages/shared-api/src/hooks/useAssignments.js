import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
export const ASSIGNMENTS_QUERY_KEY = ['assignments'];
export function useAssignments(service, classId) {
    const queryClient = useQueryClient();
    const queryKey = classId ? [...ASSIGNMENTS_QUERY_KEY, classId] : ASSIGNMENTS_QUERY_KEY;
    const query = useQuery({
        queryKey,
        queryFn: () => service.getAssignments(classId || undefined),
    });
    const createMutation = useMutation({
        mutationFn: (data) => service.createAssignment(data),
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
export function useAssignmentSubmissions(service, assignmentId) {
    return useQuery({
        queryKey: ['submissions', assignmentId],
        queryFn: () => service.getSubmissions(assignmentId),
        enabled: !!assignmentId,
    });
}
//# sourceMappingURL=useAssignments.js.map