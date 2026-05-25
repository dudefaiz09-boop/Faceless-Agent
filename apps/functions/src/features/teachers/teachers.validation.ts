import { z } from 'zod';

export const createTeacherSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(1),
      subjectIds: z.array(z.string()).optional(),
      subjects: z.array(z.string()).optional(),
      classIds: z.array(z.string()).optional(),
      classes: z.array(z.string()).optional(),
    })
    .strict(),
});

export const bulkTeachersSchema = z.object({
  body: z
    .object({
      teachers: z.array(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
          displayName: z.string().min(1),
          subjectIds: z.array(z.string()).optional(),
          subjects: z.array(z.string()).optional(),
          classIds: z.array(z.string()).optional(),
          classes: z.array(z.string()).optional(),
        })
      ),
    })
    .strict(),
});

export const updateTeacherParamsSchema = z.object({
  params: z.object({ uid: z.string() }),
});

export const updateTeacherSchema = z.object({
  body: z
    .object({
      displayName: z.string().min(1).optional(),
      subjectIds: z.array(z.string()).optional(),
      subjects: z.array(z.string()).optional(),
      classIds: z.array(z.string()).optional(),
      classes: z.array(z.string()).optional(),
    })
    .strict(),
});
