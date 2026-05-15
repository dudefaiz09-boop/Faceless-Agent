import { Router } from 'express';
import { checkAdmin } from '../middleware/auth.js';
import { createManagedUser, updateManagedUser } from '../lib/user-management.js';

const router: Router = Router();

router.post('/create', checkAdmin, async (req, res, next) => {
  try {
    const profile = await createManagedUser(
      {
        ...req.body,
        role: 'teacher',
        subjectIds: req.body.subjectIds || req.body.subjects || [],
        classIds: req.body.classIds || req.body.classes || [],
      },
      { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId }
    );

    res.json({ success: true, uid: profile.uid, profile });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-import', checkAdmin, async (req, res, next) => {
  try {
    const teachers = Array.isArray(req.body?.teachers) ? req.body.teachers : [];
    const results = [];

    for (const teacher of teachers) {
      try {
        const profile = await createManagedUser(
          {
            ...teacher,
            role: 'teacher',
            subjectIds: teacher.subjectIds || teacher.subjects || [],
            classIds: teacher.classIds || teacher.classes || [],
          },
          { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId }
        );
        results.push({ success: true, uid: profile.uid, email: profile.email });
      } catch (error) {
        results.push({
          success: false,
          email: teacher.email,
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
    const uid = req.params.uid as string;
    const profile = await updateManagedUser(
      uid,
      {
        ...req.body,
        role: 'teacher',
        subjectIds: req.body.subjectIds || req.body.subjects || [],
        classIds: req.body.classIds || req.body.classes || [],
      },
      { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
      'teacher_updated'
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
      { role: 'teacher', status: 'inactive' },
      { uid: req.user!.uid, email: req.user!.email, schoolId: req.user!.schoolId },
      'teacher_deactivated'
    );
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

export default router;
