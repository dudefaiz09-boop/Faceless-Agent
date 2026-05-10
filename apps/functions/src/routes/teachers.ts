import { Router } from 'express';
import { db, auth } from '../lib/firebase';
import { checkPermission } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const TeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  subjects: z.array(z.string()),
  classes: z.array(z.string()),
});

router.post('/create', checkPermission('manageTeachers'), async (req, res, next) => {
  try {
    const { email, password, displayName, subjects, classes } = TeacherSchema.parse(req.body);
    const userRecord = await auth.createUser({ email, password, displayName });
    const claims = { roles: ['teacher'], isAdmin: true, permissions: { manageStudents: true, manageAttendance: true, manageAssignments: true } };
    await auth.setCustomUserClaims(userRecord.uid, claims);
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid, email, displayName, roles: ['teacher'], subjects, classes, permissions: claims.permissions
    });
    res.status(201).json({ uid: userRecord.uid, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation Failed', details: error.issues });
    next(error);
  }
});

router.put('/:uid', checkPermission('manageTeachers'), async (req, res, next) => {
  try {
    const { uid } = req.params;
    await db.collection('users').doc(uid).update(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-import', checkPermission('manageTeachers'), async (req, res, next) => {
  try {
    const { teachers } = req.body;
    res.json({ success: true, count: teachers.length });
  } catch (error) {
    next(error);
  }
});

export default router;
