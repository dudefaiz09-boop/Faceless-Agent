import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  query: z.object({
    tenantId: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().optional().default(100),
  }),
});

export const auditLogsQuerySchema = z.object({
  query: z.object({
    targetUid: z.string().optional(),
    limit: z.coerce.number().optional().default(100),
  }),
});

export const createManagedUserSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(1),
      role: z.string().optional(),
      roles: z.array(z.string()).optional(),
      tenantId: z.string().optional(),
      classId: z.string().optional(),
      classIds: z.array(z.string()).optional(),
      phone: z.string().optional(),
      status: z.string().optional(),
    })
    .strict(),
});

export const bulkManagedUsersSchema = z.object({
  body: z
    .object({
      users: z.array(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
          displayName: z.string().min(1),
          role: z.string().optional(),
          roles: z.array(z.string()).optional(),
          tenantId: z.string().optional(),
          classId: z.string().optional(),
          classIds: z.array(z.string()).optional(),
          phone: z.string().optional(),
          status: z.string().optional(),
        })
      ),
    })
    .strict(),
});

export const updateManagedUserSchema = z.object({
  body: z
    .object({
      displayName: z.string().optional(),
      role: z.string().optional(),
      roles: z.array(z.string()).optional(),
      tenantId: z.string().optional(),
      classId: z.string().optional(),
      classIds: z.array(z.string()).optional(),
      phone: z.string().optional(),
      status: z.string().optional(),
    })
    .strict(),
});

export const userParamsSchema = z.object({
  params: z.object({ uid: z.string() }),
});

export const updateOwnProfileSchema = z.object({
  body: z
    .object({
      displayName: z.string().min(1).optional(),
      photoURL: z.string().optional(),
    })
    .strict(),
});
