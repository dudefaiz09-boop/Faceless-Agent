import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import { createManagedUser, updateManagedUser } from '../lib/user-management.js';
import {
  bulkTeachersSchema,
  createTeacherSchema,
  updateTeacherParamsSchema,
  updateTeacherSchema,
} from '../schemas/teachers.js';

const router: Router = Router();

function actorFromRequest(req: Express.Request) {
  return {
    uid: req.user!.uid,
    email: req.user!.email,
    schoolId: req.user!.schoolId,
  };
}

function normalizeTeacherPayload<T extends Record<string, unknown>>(payload: T) {
  return {
    ...payload,
    role: 'teacher',
    subjectIds: payload.subjectIds || payload.subjects || [],
    classIds: payload.classIds || payload.classes || [],
  };
}

router.post('/create', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const parsedBody = createTeacherSchema.parse(req.body);

    const profile = await createManagedUser(
      normalizeTeacherPayload(parsedBody),
      actorFromRequest(req)
    );

    res.json({ success: true, uid: profile.uid, profile });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-import', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { teachers } = bulkTeachersSchema.parse(req.body);
    const results = [];

    for (const teacher of teachers) {
      try {
        const profile = await createManagedUser(
          normalizeTeacherPayload(teacher),
          actorFromRequest(req)
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

router.put('/:uid', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { uid } = updateTeacherParamsSchema.parse(req.params);
    const parsedBody = updateTeacherSchema.parse(req.body);

    const profile = await updateManagedUser(
      uid,
      normalizeTeacherPayload(parsedBody),
      actorFromRequest(req),
      'teacher_updated'
    );

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

router.delete('/:uid', requirePermission('manageUsers'), async (req, res, next) => {
  try {
    const { uid } = updateTeacherParamsSchema.parse(req.params);

    const profile = await updateManagedUser(
      uid,
      { role: 'teacher', status: 'inactive' },
      actorFromRequest(req),
      'teacher_deactivated'
    );

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

export default router;