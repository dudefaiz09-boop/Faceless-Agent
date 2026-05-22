import { Router } from 'express';
import { db } from '../lib/documents.js';

const router: Router = Router();

type ProfileRecord = {
  schoolId?: string;
  tenantId?: string;
  defaultTenantId?: string;
  classId?: string | null;
  classIds?: string[];
  subjectIds?: string[];
  sectionIds?: string[];
  linkedStudentIds?: string[];
  assignedModules?: string[];
  is_super_admin?: boolean;
  isSuperAdmin?: boolean;
  managed_tenant_ids?: string[];
  managedTenantIds?: string[];
  roles?: string[];
  role?: string;
  permissions?: Record<string, boolean>;
  disabled?: boolean;
  status?: string;
};

router.get('/profile', async (req, res, next) => {
  try {
    const user = req.user!;
    const snapshot = await db.collection('users').doc(user.uid).get();
    const profile = snapshot.exists ? ((snapshot.data() || {}) as ProfileRecord) : {};

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      ...profile,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
