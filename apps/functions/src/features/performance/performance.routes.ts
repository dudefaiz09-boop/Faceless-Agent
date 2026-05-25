import { Router } from 'express';
import { PerformanceController } from './performance.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  performanceReportParamsSchema,
  performanceUploadSchema,
  studentPerformanceParamsSchema,
} from './performance.validation.js';
import { requireAnyPermission, requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();
const requirePerformanceViewer = requireAnyPermission([
  'viewPerformance',
  'managePerformance',
  'viewReports',
]);

router.get(
  '/report/:classId',
  requirePerformanceViewer,
  validate(performanceReportParamsSchema),
  PerformanceController.getReport
);
router.post(
  '/upload',
  requirePermission('managePerformance'),
  validate(performanceUploadSchema),
  PerformanceController.upload
);
router.get(
  '/:studentId',
  validate(studentPerformanceParamsSchema),
  PerformanceController.getStudentPerformance
);

export default router;
