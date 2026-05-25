import { Router } from 'express';
import { TeachersController } from './teachers.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createTeacherSchema,
  bulkTeachersSchema,
  updateTeacherParamsSchema,
  updateTeacherSchema,
} from './teachers.validation.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.post(
  '/create',
  requirePermission('manageUsers'),
  validate(createTeacherSchema),
  TeachersController.create
);
router.post(
  '/bulk-import',
  requirePermission('manageUsers'),
  validate(bulkTeachersSchema),
  TeachersController.bulkImport
);
router.put(
  '/:uid',
  requirePermission('manageUsers'),
  validate(updateTeacherSchema),
  TeachersController.update
);
router.delete(
  '/:uid',
  requirePermission('manageUsers'),
  validate(updateTeacherParamsSchema),
  TeachersController.deactivate
);

export default router;
