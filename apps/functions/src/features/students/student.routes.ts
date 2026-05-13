import { Router } from 'express';
import { StudentController } from './student.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentQuerySchema,
} from './student.validation.js';
import { checkPermission } from '../../middleware/auth.js';

const router: Router = Router();

router.post(
  '/create',
  checkPermission('manageStudents'),
  validate(createStudentSchema),
  StudentController.create
);

router.put(
  '/:uid',
  checkPermission('manageStudents'),
  validate(updateStudentSchema),
  StudentController.update
);

router.get(
  '/:uid',
  checkPermission('viewStudentDetails'),
  validate(studentQuerySchema),
  StudentController.getProfile
);

router.delete('/:uid', checkPermission('manageStudents'), StudentController.delete);

export default router;
