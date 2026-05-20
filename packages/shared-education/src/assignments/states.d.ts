export declare const ASSIGNMENT_STATUS: {
  readonly DRAFT: 'draft';
  readonly SCHEDULED: 'scheduled';
  readonly PUBLISHED: 'published';
  readonly ARCHIVED: 'archived';
};
export declare const SUBMISSION_STATUS: {
  readonly PENDING: 'pending';
  readonly SUBMITTED: 'submitted';
  readonly LATE: 'late';
  readonly MISSING: 'missing';
  readonly GRADED: 'graded';
  readonly RETURNED: 'returned';
  readonly RESUBMITTED: 'resubmitted';
  readonly REJECTED: 'rejected';
};
export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];
