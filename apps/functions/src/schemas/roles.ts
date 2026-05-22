import { z } from 'zod';
import { ALL_ROLES } from '@educonnect/shared';

const nonEmptyString = z.string().trim().min(1);
const roleSchema = z.enum(ALL_ROLES);

export const updateRoleSchema = z
  .object({
    uid: nonEmptyString,
    role: roleSchema,
    roles: z.array(roleSchema).optional(),
    permissions: z.record(z.string(), z.boolean()).optional(),
    assignedModules: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();