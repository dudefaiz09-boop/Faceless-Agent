import { Assignment, AssignmentSubmission } from '@educonnect/shared-education';
import { AssignmentStats } from './schemas.js';

/**
 * ASSIGNMENT ANALYTICS ENGINE
 */
export class AssignmentAnalytics {
  /**
   * Calculates comprehensive stats for a specific assignment
   */
  static calculateStats(
    assignment: Assignment & { id: string },
    submissions: AssignmentSubmission[]
  ): AssignmentStats {
    const totalStudents = assignment.targetClasses.length > 0 ? 0 : 0; // In a real scenario, we'd pass the class size
    // For this implementation, we treat the number of submissions + missing as total if not provided
    
    const submittedCount = submissions.length;
    const gradedCount = submissions.filter(s => s.status === 'graded' || s.status === 'returned').length;
    
    const scores = submissions
      .map(s => parseFloat(s.grade || ''))
      .filter(n => !isNaN(n));
      
    const avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : undefined;

    const lateSubmissionCount = submissions.filter(s => {
        if (!s.submittedAt) return false;
        return new Date(s.submittedAt) > new Date(assignment.dueDate);
    }).length;

    return {
      assignmentId: assignment.id,
      title: assignment.title,
      dueDate: assignment.dueDate,
      totalStudents: assignment.pointsPossible, // Placeholder mapping or external count
      submittedCount,
      gradedCount,
      avgScore,
      submissionRate: 0, // Would require total class size
      lateSubmissionCount,
    };
  }
}
