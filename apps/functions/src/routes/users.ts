import { Router } from 'express';
import { checkAdmin } from '../middleware/auth.js';
import {
  createManagedUser,
  updateManagedUser,
  writeAuditLog,
  type ManagedUserPayload,
} from '../lib/user-management.js';

const router: Router = Router();

function actorFromRequest(req: any) {
  return {
    uid: req.user.uid,
    email: req.user.email,
    schoolId: req.tenantId || req.user.schoolId,
  };
}

router.post('/create', checkAdmin, async (req, res, next) => {
  try {
    const profile = await createManagedUser(
      { ...req.body, tenantId: req.body.tenantId || req.tenantId },
      actorFromRequest(req)
    );
    res.status(201).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-import', checkAdmin, async (req, res, next) => {
  try {
    const users = Array.isArray(req.body?.users) ? (req.body.users as ManagedUserPayload[]) : [];
    if (users.length === 0) {
      return res.status(400).json({ error: 'users array is required' });
    }

    const results = [];
    for (const user of users) {
      try {
        // Support per-user tenantId from CSV or fallback to request tenantId
        const payload = {
          ...user,
          tenantId: user.tenantId || req.tenantId,
        };
        const profile = await createManagedUser(payload, actorFromRequest(req));
        results.push({ success: true, uid: profile.uid, email: profile.email });
      } catch (error) {
        results.push({
          success: false,
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

router.post('/import-csv', checkAdmin, async (req, res, next) => {
  // Re-use the logic from bulk-import directly to avoid recursion with router.handle
  try {
    const users = Array.isArray(req.body?.users) ? (req.body.users as ManagedUserPayload[]) : [];
    if (users.length === 0) {
      return res.status(400).json({ error: 'users array is required' });
    }

    const results = [];
    for (const user of users) {
      try {
        const payload = {
          ...user,
          tenantId: user.tenantId || req.tenantId,
        };
        const profile = await createManagedUser(payload, actorFromRequest(req));
        results.push({ success: true, uid: profile.uid, email: profile.email });
      } catch (error) {
        results.push({
          success: false,
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

router.put('/:uid', checkAdmin, async (req, res, next) => {
  try {
    const profile = await updateManagedUser(req.params.uid, req.body, actorFromRequest(req));
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.patch('/:uid/deactivate', checkAdmin, async (req, res, next) => {
  try {
    const profile = await updateManagedUser(
      req.params.uid,
      { status: 'inactive' },
      actorFromRequest(req),
      'user_deactivated'
    );
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.delete('/:uid', checkAdmin, async (req, res, next) => {
  try {
    const profile = await updateManagedUser(
      req.params.uid,
      { status: 'inactive' },
      actorFromRequest(req),
      'user_deactivated'
    );

    await writeAuditLog({
      action: 'user_delete_requested',
      targetUid: req.params.uid,
      performedBy: req.user!.uid,
      details: `Delete requested; ${profile.email || req.params.uid} was deactivated instead`,
      before: profile,
      after: profile,
      schoolId: profile.schoolId,
    });

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

export default router;
