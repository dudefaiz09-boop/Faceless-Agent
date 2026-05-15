import { Router } from 'express';
import { isRole } from '@educonnect/shared';
import { checkAdmin } from '../middleware/auth.js';
import { updateManagedUser } from '../lib/user-management.js';

const router: Router = Router();

router.post('/', checkAdmin, async (req, res, next) => {
  try {
    const { uid, role } = req.body;

    if (!uid || !role) {
      return res.status(400).json({ error: 'uid and role are required' });
    }

    if (!isRole(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const profile = await updateManagedUser(
      uid,
      req.body,
      {
        uid: req.user!.uid,
        email: req.user!.email,
        schoolId: req.user!.schoolId,
      },
      'role_or_access_changed'
    );

    res.json({ success: true, uid, profile });
  } catch (error) {
    next(error);
  }
});

export default router;
