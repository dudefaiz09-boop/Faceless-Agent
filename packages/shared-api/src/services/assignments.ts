import { ApiClient } from '../client/base.js';
import { Assignment, AssignmentSubmission } from '@educonnect/shared-education';

export class AssignmentsService {
  constructor(private client: ApiClient) {}

  async getAssignments(classId?: string) {
    return this.client.get<Assignment[]>(`/assignments${classId ? `?classId=${classId}` : ''}`);
  }

  async listAssignments(classId?: string) {
    return this.getAssignments(classId);
  }

  async createAssignment(data: Partial<Assignment>) {
    return this.client.post<Assignment>('/assignments/create', data);
  }

  async submitAssignment(data: { assignmentId: string; content: string; fileUrl?: string }) {
    return this.client.post<any>('/assignments/submit', data);
  }

  async getMyHistory(uid: string) {
    return this.client.get<AssignmentSubmission[]>(`/assignments/history/${uid}`);
  }

  async getSubmissions(assignmentId: string) {
    return this.client.get<AssignmentSubmission[]>(`/assignments/submissions/${assignmentId}`);
  }

  async gradeSubmission(data: {
    assignmentId: string;
    studentId: string;
    teacherScore: string;
    teacherFeedback: string;
  }) {
    return this.client.post<any>('/assignments/recheck', data);
  }
}
