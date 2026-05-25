import { z } from 'zod';

export const updateRoleSchema = z.object({
  body: z
    .object({
      uid: z.string(),
      role: z.string().optional(),
      roles: z.array(z.string()).optional(),
      permissions: z.record(z.boolean()).optional(),
      assignedModules: z.array(z.string()).optional(),
    })
    .strict(),
});
