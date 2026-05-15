import { Router } from 'express';
import { StudentController } from './student.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentQuerySchema,
} from './student.validation.js';
import { checkAdmin, checkPermission } from '../../middleware/auth.js';

const router: Router = Router();

router.post(
  '/create',
  checkAdmin,
  validate(createStudentSchema),
  StudentController.create
);

router.put(
  '/:uid',
  checkAdmin,
  validate(updateStudentSchema),
  StudentController.update
);

router.get(
  '/:uid',
  checkPermission('viewStudentDetails'),
  validate(studentQuerySchema),
  StudentController.getProfile
);

router.delete('/:uid', checkAdmin, StudentController.delete);

export default router;
