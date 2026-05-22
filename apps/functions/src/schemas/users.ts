import { z } from 'zod';
import {
  ALL_MODULES,
  ALL_PERMISSIONS,
  ALL_ROLES,
} from '@educonnect/shared';

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = nonEmptyString.optional();

const roleSchema = z.enum(ALL_ROLES);
const moduleSchema = z.enum(ALL_MODULES);
const permissionSchema = z.enum(ALL_PERMISSIONS);

const stringArraySchema = z
  .array(z.string().trim().min(1))
  .default([]);

const permissionMapSchema = z.record(z.string(), z.boolean());

const permissionsSchema = z.union([
  z.array(permissionSchema),
  permissionMapSchema,
]);

export const updateOwnProfileSchema = z
  .object({
    displayName: optionalNonEmptyString,
    photoURL: z.string().url().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field is required.',
  });

export const createManagedUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).optional(),
    displayName: optionalNonEmptyString,
    role: roleSchema,
    roles: z.array(roleSchema).optional(),
    permissions: permissionsSchema.optional(),
    assignedModules: z.array(moduleSchema).optional(),
    classIds: stringArraySchema.optional(),
    subjectIds: stringArraySchema.optional(),
    sectionIds: stringArraySchema.optional(),
    linkedStudentIds: stringArraySchema.optional(),
    tenantId: optionalNonEmptyString,
    status: z.enum(['active', 'inactive']).optional(),
    phone: optionalNonEmptyString,
    admissionNumber: optionalNonEmptyString,
    employeeId: optionalNonEmptyString,
  })
  .strict();

export const updateManagedUserSchema = createManagedUserSchema
  .partial()
  .omit({
    password: true,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one user field is required.',
  });

export const bulkManagedUsersSchema = z
  .object({
    users: z.array(createManagedUserSchema).min(1, 'At least one user is required.'),
  })
  .strict();

export const userParamsSchema = z
  .object({
    uid: nonEmptyString,
  })
  .strict();

export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export type UpdateManagedUserInput = z.infer<typeof updateManagedUserSchema>;
export type BulkManagedUsersInput = z.infer<typeof bulkManagedUsersSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;