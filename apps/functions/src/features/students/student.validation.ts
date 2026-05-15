import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(2),
      classId: z.string().optional(),
      classIds: z.array(z.string()).optional(),
      section: z.string().optional(),
      sectionIds: z.array(z.string()).optional(),
      admissionNumber: z.string().optional(),
      phone: z.string().optional(),
    })
    .strict(),
});

export const updateStudentSchema = z.object({
  params: z.object({
    uid: z.string(),
  }),
  body: z
    .object({
      displayName: z.string().min(2).optional(),
      classId: z.string().optional(),
      section: z.string().optional(),
    })
    .strict(),
});

export const studentQuerySchema = z.object({
  params: z.object({
    uid: z.string(),
  }),
});
