import { ApiClient } from '../client/base.js';
import { Assignment, AssignmentSubmission } from '@educonnect/shared-education';
export declare class AssignmentsService {
  private client;
  constructor(client: ApiClient);
  getAssignments(classId?: string): Promise<Assignment[]>;
  listAssignments(classId?: string): Promise<Assignment[]>;
  createAssignment(data: Partial<Assignment>): Promise<Assignment>;
  submitAssignment(data: { assignmentId: string; content: string; fileUrl?: string }): Promise<any>;
  getMyHistory(uid: string): Promise<AssignmentSubmission[]>;
  getSubmissions(assignmentId: string): Promise<AssignmentSubmission[]>;
  gradeSubmission(data: {
    assignmentId: string;
    studentId: string;
    teacherScore: string;
    teacherFeedback: string;
  }): Promise<any>;
}
