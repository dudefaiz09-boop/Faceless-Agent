import { z } from 'zod';

export const classReportParamsSchema = z.object({
  params: z.object({ classId: z.string() }),
});

export const feeUploadSchema = z.object({
  body: z
    .object({
      records: z.array(
        z.object({
          studentId: z.string(),
          classId: z.string(),
          dueDate: z.string(),
          amountDue: z.number().positive(),
        })
      ),
    })
    .strict(),
});

export const feePaymentSchema = z.object({
  body: z
    .object({
      feeId: z.string(),
      amount: z.number().positive(),
      method: z.string().optional(),
    })
    .strict(),
});

export const studentFeesParamsSchema = z.object({
  params: z.object({ uid: z.string() }),
});
