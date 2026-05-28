import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { StudentController } from './student.controller.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../middleware/error.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentQuerySchema,
  bulkImportSchema,
} from './student.validation.js';
import { checkAdmin, checkPermission } from '../../middleware/auth.js';
import { actorHasRole } from '../../lib/authorization.js';

const router: Router = Router();

function canViewStudentProfile(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  const uid = req.params.uid as string;

  if (!user)
    return next(new AppError({ code: 'AUTH_REQUIRED', message: 'Unauthorized', statusCode: 401 }));
  if (user.isAdmin || user.permissions.viewStudentDetails) return next();
  if (user.uid === uid && user.permissions.viewOwnRecords) return next();
  if (actorHasRole(user, 'parent') && user.linkedStudentIds.includes(uid)) return next();
  if (user.linkedStudentIds.includes(uid) && user.permissions.viewOwnRecords) return next();

  return checkPermission('viewStudentDetails')(req, res, next);
}

router.post('/create', checkAdmin, validate(createStudentSchema), StudentController.create);

router.post('/bulk-import', checkAdmin, validate(bulkImportSchema), StudentController.bulkImport);

router.put('/:uid', checkAdmin, validate(updateStudentSchema), StudentController.update);

router.get(
  '/:uid',
  canViewStudentProfile,
  validate(studentQuerySchema),
  StudentController.getProfile
);

router.delete('/:uid', checkAdmin, StudentController.delete);

export default router;
