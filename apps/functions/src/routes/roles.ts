import { Router } from 'express';
import { auth, db } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';

const router: Router = Router();

// Update user role (Admin only)
router.post('/', checkPermission('manageUsers'), async (req, res, next) => {
  try {
    const { uid, role } = req.body;

    if (!uid || !role) {
      return res.status(400).json({ error: 'UID and role are required' });
    }

    // 1. Update Custom Claims
    const claims = { roles: [role], isAdmin: role === 'admin' };
    await auth.setCustomUserClaims(uid, claims);

    // 2. Update the Supabase-backed profile document.
    await db.collection('users').doc(uid).update({ role, roles: [role] });

    res.json({ success: true, message: `User ${uid} role updated to ${role}` });
  } catch (error) {
    next(error);
  }
});

export default router;
