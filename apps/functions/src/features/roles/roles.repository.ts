import { updateManagedUser } from '../../lib/user-management.js';

type Actor = { uid: string; email?: string; schoolId?: string | null };

export class RolesRepository {
  static async updateRole(
    uid: string,
    data: {
      role?: string;
      roles?: string[];
      permissions?: Record<string, boolean>;
      assignedModules?: string[];
    },
    actor: Actor
  ) {
    return updateManagedUser(uid, data, actor, 'role_or_access_changed');
  }
}
