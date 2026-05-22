import { Router } from 'express';
import { requireAnyRole } from '../middleware/permissions.js';
import { updateManagedUser } from '../lib/user-management.js';
import { updateRoleSchema } from '../schemas/roles.js';

const router: Router = Router();

router.post('/', requireAnyRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const parsedBody = updateRoleSchema.parse(req.body);

    const profile = await updateManagedUser(
      parsedBody.uid,
      {
        role: parsedBody.role,
        roles: parsedBody.roles,
        permissions: parsedBody.permissions,
        assignedModules: parsedBody.assignedModules,
      },
      {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      },
      'role_or_access_changed'
    );

    res.json({ success: true, uid: parsedBody.uid, profile });
  } catch (error) {
    next(error);
  }
});

export default router;