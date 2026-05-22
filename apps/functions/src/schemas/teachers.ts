import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = nonEmptyString.optional();
const stringArraySchema = z.array(z.string().trim().min(1)).optional().default([]);

const teacherBaseSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).optional(),
    displayName: nonEmptyString,
    phone: optionalNonEmptyString,
    status: z.enum(['active', 'inactive']).optional(),
    tenantId: optionalNonEmptyString,
    schoolId: optionalNonEmptyString,
    subjectIds: stringArraySchema,
    subjects: stringArraySchema,
    classIds: stringArraySchema,
    classes: stringArraySchema,
    employeeId: optionalNonEmptyString,
  })
  .strict();

export const createTeacherSchema = teacherBaseSchema;

export const bulkTeachersSchema = z
  .object({
    teachers: z.array(createTeacherSchema).min(1, 'At least one teacher is required.'),
  })
  .strict();

export const updateTeacherParamsSchema = z
  .object({
    uid: nonEmptyString,
  })
  .strict();

export const updateTeacherSchema = teacherBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one teacher field is required.',
  });