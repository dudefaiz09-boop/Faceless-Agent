import { Router } from 'express';
import { db, auth } from '../lib/firebase.js';
import { checkPermission } from '../middleware/auth.js';

const router: Router = Router();

router.post('/create', checkPermission('manageTeachers'), async (req, res, next) => {
  try {
    const { email, password, displayName, subjects } = req.body;
    const userRecord = await auth.createUser({ email, password, displayName });

    await auth.setCustomUserClaims(userRecord.uid, {
      roles: ['teacher'],
      permissions: { manageAssignments: true },
    });

    await db
      .collection('users')
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email,
        displayName,
        roles: ['teacher'],
        subjects,
        createdAt: new Date().toISOString(),
      });

    res.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    next(error);
  }
});

router.put('/:uid', checkPermission('manageTeachers'), async (req, res, next) => {
  try {
    const uid = req.params.uid as string;
    await db.collection('users').doc(uid).update(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
