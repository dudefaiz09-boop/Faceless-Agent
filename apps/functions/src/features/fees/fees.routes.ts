import { Router } from 'express';
import { FeesController } from './fees.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  classReportParamsSchema,
  feeUploadSchema,
  feePaymentSchema,
  studentFeesParamsSchema,
} from './fees.validation.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get(
  '/report/:classId',
  requirePermission('manageFees'),
  validate(classReportParamsSchema),
  FeesController.getReport
);
router.post(
  '/upload',
  requirePermission('manageFees'),
  validate(feeUploadSchema),
  FeesController.upload
);
router.post('/pay', validate(feePaymentSchema), FeesController.pay);
router.get('/:uid', validate(studentFeesParamsSchema), FeesController.getStudentFees);

export default router;
