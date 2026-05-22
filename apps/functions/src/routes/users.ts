import { Router, type Request } from 'express';
import { createManagedUser, updateManagedUser, writeAuditLog } from '../lib/user-management.js';
import { auth, db } from '../lib/documents.js';
import { requireAnyRole, requirePermission } from '../middleware/permissions.js';
import {
  auditLogsQuerySchema,
  bulkManagedUsersSchema,
  createManagedUserSchema,
  listUsersQuerySchema,
  updateManagedUserSchema,
  updateOwnProfileSchema,
  userParamsSchema,
} from '../schemas/users.js';

const router: Router = Router();

function actorFromRequest(req: Request) {
  return {
    uid: req.user!.uid,
    email: req.user!.email,
    schoolId: req.tenantId || req.user!.schoolId,
  };
}

type UserListRecord = {
  id: string;
  uid?: string;
  displayName?: string;
  email?: string;
  role?: string;
  roles?: string[];
  status?: string;
  schoolId?: string;
  tenantId?: string;
  managedTenantIds?: string[];
  [key: string]: unknown;
};

type AuditLogRecord = {
  id: string;
  targetUid?: string;
  timestamp?: string;
  createdAt?: string;
  tenantId?: string;
  schoolId?: string;
  [key: string]: unknown;
};

router.get('/', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { tenantId, role, status, search, limit } = listUsersQuerySchema.parse(req.query);

    const requestedTenantId = tenantId || req.tenantId;
    const canSwitchTenant =
      Boolean(req.user!.isSuperAdmin) &&
      Boolean(requestedTenantId) &&
      Boolean(req.user!.managedTenantIds?.includes(requestedTenantId));

    if (requestedTenantId !== req.tenantId && !canSwitchTenant) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant access denied' });
    }

    const snapshot = await db.collection('users').where('tenantId', '==', requestedTenantId).get();

    let users = snapshot.docs.map((doc) => ({
      id: doc.id,
      uid: doc.id,
      ...(doc.data() as Omit<UserListRecord, 'id'>),
    }));

    if (role) {
      users = users.filter((profile) => {
        const roles = Array.isArray(profile.roles) ? profile.roles : [];
        return profile.role === role || roles.includes(role);
      });
    }

    if (status) {
      users = users.filter((profile) => profile.status === status);
    }

    if (search) {
      const query = search.toLowerCase();
      users = users.filter((profile) =>
        `${profile.displayName || ''} ${profile.email || ''} ${profile.role || ''}`
          .toLowerCase()
          .includes(query)
      );
    }

    res.json(users.slice(0, limit));
  } catch (error) {
    next(error);
  }
});

router.get('/tenants', requireAnyRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const allowedTenantIds = req.user!.isSuperAdmin
      ? req.user!.managedTenantIds || []
      : req.tenantId
        ? [req.tenantId]
        : [];

    if (allowedTenantIds.length === 0) {
      return res.json([]);
    }

    const snapshot = await db.collection('schools').get();

    const tenants = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((tenant) => allowedTenantIds.includes(String(tenant.id)));

    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

router.get('/audit-logs', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { targetUid, limit } = auditLogsQuerySchema.parse(req.query);

    const snapshot = await db.collection('auditLogs').where('tenantId', '==', req.tenantId).get();

    let logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AuditLogRecord, 'id'>),
    }));

    if (targetUid) {
      logs = logs.filter((log) => log.targetUid === targetUid);
    }

    logs = logs.sort((a, b) => {
      const left = new Date(String(a.timestamp || a.createdAt || 0)).getTime();
      const right = new Date(String(b.timestamp || b.createdAt || 0)).getTime();
      return right - left;
    });

    res.json(logs.slice(0, limit));
  } catch (error) {
    next(error);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    const uid = req.user!.uid;
    const { displayName, photoURL } = updateOwnProfileSchema.parse(req.body);
    const supabaseAdmin = auth.getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    if (displayName) updateData.display_name = displayName;
    if (photoURL) updateData.avatar_url = photoURL;

    await supabaseAdmin.auth.admin.updateUserById(uid, {
      user_metadata: updateData,
    });

    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();

    if (snapshot.exists) {
      const before = snapshot.data() || {};
      const after = {
        ...before,
        ...(displayName ? { displayName } : {}),
        ...(photoURL ? { photoURL } : {}),
        updatedAt: new Date().toISOString(),
      };

      await userRef.update(after);

      await supabaseAdmin.from('profiles').upsert({
        id: uid,
        display_name: after.displayName,
        updated_at: after.updatedAt,
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/create', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const parsedBody = createManagedUserSchema.parse(req.body);

    const profile = await createManagedUser(
      { ...parsedBody, tenantId: parsedBody.tenantId || req.tenantId },
      actorFromRequest(req)
    );

    res.status(201).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-import', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { users } = bulkManagedUsersSchema.parse(req.body);

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

router.post('/import-csv', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { users } = bulkManagedUsersSchema.parse(req.body);

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

router.put('/:uid', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { uid } = userParamsSchema.parse(req.params);
    const parsedBody = updateManagedUserSchema.parse(req.body);

    const profile = await updateManagedUser(uid, parsedBody, actorFromRequest(req));

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.patch('/:uid/deactivate', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { uid } = userParamsSchema.parse(req.params);

    const profile = await updateManagedUser(
      uid,
      { status: 'inactive' },
      actorFromRequest(req),
      'user_deactivated'
    );

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.delete('/:uid', requireAnyRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { uid } = userParamsSchema.parse(req.params);

    const profile = await updateManagedUser(
      uid,
      { status: 'inactive' },
      actorFromRequest(req),
      'user_deactivated'
    );

    await writeAuditLog({
      action: 'user_delete_requested',
      targetUid: uid,
      performedBy: req.user!.uid,
      details: `Delete requested; ${profile.email || uid} was deactivated instead`,
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
