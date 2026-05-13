import { z } from 'zod';

export const AssignmentStatsSchema = z.object({
  assignmentId: z.string(),
  title: z.string(),
  dueDate: z.string(),
  totalStudents: z.number(),
  submittedCount: z.number(),
  gradedCount: z.number(),
  avgScore: z.number().optional(),
  submissionRate: z.number(),
  lateSubmissionCount: z.number(),
});

export type AssignmentStats = z.infer<typeof AssignmentStatsSchema>;

export const ClassPerformanceSchema = z.object({
  classId: z.string(),
  period: z.string(),
  avgCompletionRate: z.number(),
  avgGrade: z.number(),
  topPerformingStudents: z.array(z.string()),
  atRiskStudents: z.array(z.string()),
});

export type ClassPerformance = z.infer<typeof ClassPerformanceSchema>;
