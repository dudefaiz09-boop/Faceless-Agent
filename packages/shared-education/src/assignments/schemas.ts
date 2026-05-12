import { z } from 'zod';
import { BaseSaaSObjectSchema } from '../core/schemas.js';
import { ASSIGNMENT_STATUS, SUBMISSION_STATUS } from './states.js';

export const RubricCriterionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  maxPoints: z.number(),
});

export const RubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema),
});

export const AttachmentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number().optional(),
});

export const AssignmentSchema = BaseSaaSObjectSchema.extend({
  title: z.string().min(1),
  description: z.string(),
  dueDate: z.string(), // ISO String
  targetClasses: z.array(z.string()),
  status: z.nativeEnum(ASSIGNMENT_STATUS).default(ASSIGNMENT_STATUS.PUBLISHED),
  attachments: z.array(AttachmentSchema).default([]),
  rubric: RubricSchema.optional(),
  teacherId: z.string(),
  pointsPossible: z.number().default(100),
  allowResubmissions: z.boolean().default(true),
});

export const SubmissionCommentSchema = z.object({
  authorId: z.string(),
  text: z.string(),
  createdAt: z.string(),
});

export const AssignmentSubmissionSchema = BaseSaaSObjectSchema.extend({
  assignmentId: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  status: z.nativeEnum(SUBMISSION_STATUS).default(SUBMISSION_STATUS.SUBMITTED),
  content: z.string(),
  attachments: z.array(AttachmentSchema).default([]),
  submittedAt: z.string().optional(),
  grade: z.string().nullable().optional(),
  feedback: z.string().nullable().optional(),
  teacherComments: z.array(SubmissionCommentSchema).default([]),
  aiFeedbackDraft: z.string().optional(),
  isAiFeedbackPublished: z.boolean().default(false),
});

export type Rubric = z.infer<typeof RubricSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type AssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;
