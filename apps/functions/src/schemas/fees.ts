import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);

export const classReportParamsSchema = z
  .object({
    classId: nonEmptyString,
  })
  .strict();

export const studentFeesParamsSchema = z
  .object({
    uid: nonEmptyString,
  })
  .strict();

export const feeUploadRecordSchema = z
  .object({
    studentId: nonEmptyString,
    classId: nonEmptyString,
    amountDue: z.coerce.number().positive(),
    dueDate: nonEmptyString,
  })
  .strict();

export const feeUploadSchema = z
  .object({
    records: z.array(feeUploadRecordSchema).min(1, 'At least one fee record is required.'),
  })
  .strict();

export const feePaymentSchema = z
  .object({
    feeId: nonEmptyString,
    amount: z.coerce.number().positive(),
    method: z.string().trim().min(1).default('online'),
  })
  .strict();

export type FeeUploadInput = z.infer<typeof feeUploadSchema>;
export type FeePaymentInput = z.infer<typeof feePaymentSchema>;