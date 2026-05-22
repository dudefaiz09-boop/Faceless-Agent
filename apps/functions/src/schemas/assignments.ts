import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();
const stringArraySchema = z.array(z.string().trim().min(1));

export const assignmentClassReportParamsSchema = z
  .object({
    classId: nonEmptyString,
  })
  .strict();

export const assignmentHistoryParamsSchema = z
  .object({
    uid: nonEmptyString,
  })
  .strict();

export const assignmentSubmissionsParamsSchema = z
  .object({
    assignmentId: nonEmptyString,
  })
  .strict();

export const assignmentListParamsSchema = z
  .object({
    classId: optionalString,
  })
  .strict();

export const assignmentListQuerySchema = z
  .object({
    classId: optionalString,
  })
  .strict();

export const createAssignmentSchema = z
  .object({
    title: nonEmptyString,
    description: z.string().optional().default(''),
    subject: optionalString,
    subjectId: optionalString,
    status: z.string().trim().min(1).optional().default('published'),
    dueDate: optionalString,
    due_at: optionalString,
    classId: optionalString,
    targetClasses: stringArraySchema.optional(),
    attachments: z.array(z.unknown()).optional().default([]),
    rubric: z.unknown().nullable().optional(),
    visibility: z.string().trim().min(1).optional().default('public'),
  })
  .strict()
  .refine((value) => Boolean(value.dueDate || value.due_at), {
    message: 'dueDate is required.',
    path: ['dueDate'],
  })
  .refine((value) => Boolean(value.classId || value.targetClasses?.length), {
    message: 'classId or targetClasses is required.',
    path: ['classId'],
  });

export const assignmentIdParamsSchema = z
  .object({
    id: nonEmptyString,
  })
  .strict();

export const submitAssignmentSchema = z
  .object({
    assignmentId: optionalString,
    content: z.string().optional().default(''),
    fileUrl: optionalString,
  })
  .strict();

export const recheckAssignmentSchema = z
  .object({
    assignmentId: nonEmptyString,
    studentId: nonEmptyString,
    teacherScore: z.union([z.string(), z.number()]).optional(),
    teacherFeedback: z.string().optional().default(''),
  })
  .strict();