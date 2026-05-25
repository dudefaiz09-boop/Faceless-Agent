import { z } from 'zod';

export const createAssignmentSchema = z.object({
  body: z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      subject: z.string().optional(),
      subjectId: z.string().optional(),
      status: z.string().optional(),
      dueDate: z.string().optional(),
      due_at: z.string().optional(),
      classId: z.string().optional(),
      targetClasses: z.array(z.string()).optional(),
      attachments: z.array(z.unknown()).optional(),
      rubric: z.unknown().optional(),
      visibility: z.string().optional(),
    })
    .strict(),
});

export const assignmentListParamsSchema = z.object({
  params: z.object({
    classId: z.string().optional(),
  }),
});

export const assignmentListQuerySchema = z.object({
  query: z.object({
    classId: z.string().optional(),
  }),
});

export const assignmentIdParamsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const assignmentSubmissionsParamsSchema = z.object({
  params: z.object({
    assignmentId: z.string(),
  }),
});

export const assignmentHistoryParamsSchema = z.object({
  params: z.object({
    uid: z.string(),
  }),
});

export const assignmentClassReportParamsSchema = z.object({
  params: z.object({
    classId: z.string(),
  }),
});

export const submitAssignmentSchema = z.object({
  body: z
    .object({
      assignmentId: z.string().optional(),
      content: z.string().optional(),
      fileUrl: z.string().optional(),
    })
    .strict(),
});

export const recheckAssignmentSchema = z.object({
  body: z
    .object({
      assignmentId: z.string(),
      studentId: z.string(),
      teacherScore: z.union([z.string(), z.number()]),
      teacherFeedback: z.string().optional(),
    })
    .strict(),
});
