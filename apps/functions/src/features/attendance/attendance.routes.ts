import { Router } from 'express';
import { AttendanceController } from './attendance.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  markAttendanceSchema,
  attendanceReportParamsSchema,
  attendanceHistoryParamsSchema,
} from './attendance.validation.js';
import { requireAnyPermission, requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

const requireAttendanceViewer = requireAnyPermission([
  'viewAttendance',
  'manageAttendance',
  'markAttendance',
  'viewReports',
]);

router.get(
  '/report/:classId',
  requireAttendanceViewer,
  validate(attendanceReportParamsSchema),
  AttendanceController.getReport
);
router.get(
  '/history/:uid',
  validate(attendanceHistoryParamsSchema),
  AttendanceController.getHistory
);
router.get('/:classId?', requireAttendanceViewer, AttendanceController.list);
router.post(
  '/mark',
  requirePermission('markAttendance'),
  validate(markAttendanceSchema),
  AttendanceController.mark
);

export default router;
