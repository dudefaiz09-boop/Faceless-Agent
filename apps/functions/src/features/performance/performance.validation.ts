import { z } from 'zod';

export const performanceReportParamsSchema = z.object({
  params: z.object({ classId: z.string() }),
});

export const performanceUploadSchema = z.object({
  body: z
    .object({
      records: z.array(
        z.object({
          studentId: z.string(),
          classId: z.string(),
          subject: z.string(),
          term: z.string(),
          score: z.number(),
          grade: z.string(),
        })
      ),
    })
    .strict(),
});

export const studentPerformanceParamsSchema = z.object({
  params: z.object({ studentId: z.string() }),
});
