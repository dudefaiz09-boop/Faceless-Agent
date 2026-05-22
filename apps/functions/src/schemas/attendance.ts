import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();

export const attendanceStatusSchema = z.enum(['present', 'absent', 'late']);

export const attendanceReportParamsSchema = z
  .object({
    classId: nonEmptyString,
  })
  .strict();

export const attendanceReportQuerySchema = z
  .object({
    startDate: optionalString,
    endDate: optionalString,
  })
  .strict();

export const attendanceHistoryParamsSchema = z
  .object({
    uid: nonEmptyString,
  })
  .strict();

export const attendanceListParamsSchema = z
  .object({
    classId: optionalString,
  })
  .strict();

export const attendanceListQuerySchema = z
  .object({
    classId: optionalString,
    date: optionalString,
  })
  .strict();

export const attendanceEntrySchema = z
  .object({
    studentId: nonEmptyString,
    studentName: z.string().optional().default(''),
    status: attendanceStatusSchema.default('absent'),
  })
  .strict();

export const markAttendanceSchema = z
  .object({
    classId: nonEmptyString,
    date: nonEmptyString,
    records: z.array(attendanceEntrySchema).min(1, 'At least one attendance record is required.'),
  })
  .strict();