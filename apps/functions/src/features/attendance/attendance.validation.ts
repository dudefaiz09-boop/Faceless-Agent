import { z } from 'zod';

export const markAttendanceSchema = z.object({
  body: z
    .object({
      classId: z.string(),
      date: z.string(),
      records: z.array(
        z.object({
          studentId: z.string(),
          studentName: z.string().optional().default(''),
          status: z.enum(['present', 'absent', 'late']),
        })
      ),
    })
    .strict(),
});

export const attendanceListParamsSchema = z.object({
  params: z.object({
    classId: z.string().optional(),
  }),
});

export const attendanceListQuerySchema = z.object({
  query: z.object({
    classId: z.string().optional(),
    date: z.string().optional(),
  }),
});

export const attendanceReportParamsSchema = z.object({
  params: z.object({
    classId: z.string(),
  }),
});

export const attendanceReportQuerySchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const attendanceHistoryParamsSchema = z.object({
  params: z.object({
    uid: z.string(),
  }),
});
