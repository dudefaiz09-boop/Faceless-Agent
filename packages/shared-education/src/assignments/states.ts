import { z } from 'zod';
import { BaseSaaSObjectSchema } from '../core/schemas.js';

export const ASSIGNMENT_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  LATE: 'late',
  MISSING: 'missing',
  GRADED: 'graded',
  RETURNED: 'returned',
  RESUBMITTED: 'resubmitted',
  REJECTED: 'rejected',
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];
