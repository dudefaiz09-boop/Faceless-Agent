import { Router } from 'express';
import { db, auth } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';

const router = Router();

router.post('/create', checkPermission('manageStudents'), async (req, res, next) => {
  try {
    const { email, password, displayName, classId } = req.body;
    const userRecord = await auth.createUser({ email, password, displayName });
    const claims = { roles: ['student'], classId, permissions: { viewOwnRecords: true, submitAssignments: true } };
    await auth.setCustomUserClaims(userRecord.uid, claims);
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid, email, displayName, roles: ['student'], classId, permissions: claims.permissions
    });
    res.status(201).json({ uid: userRecord.uid, success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/:uid', checkPermission('manageStudents'), async (req, res, next) => {
  try {
    const { uid } = req.params;
    await db.collection('users').doc(uid).update(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-import', checkPermission('manageStudents'), async (req, res, next) => {
  try {
    const { students } = req.body;
    res.json({ success: true, count: students.length });
  } catch (error) {
    next(error);
  }
});

export default router;
