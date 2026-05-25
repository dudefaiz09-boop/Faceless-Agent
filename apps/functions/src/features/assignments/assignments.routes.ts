import { Router } from 'express';
import { AssignmentsController } from './assignments.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createAssignmentSchema,
  assignmentListParamsSchema,
  assignmentListQuerySchema,
  assignmentIdParamsSchema,
  assignmentSubmissionsParamsSchema,
  assignmentHistoryParamsSchema,
  assignmentClassReportParamsSchema,
  submitAssignmentSchema,
  recheckAssignmentSchema,
} from './assignments.validation.js';
import { requireAnyPermission, requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get(
  '/report/:classId',
  requireAnyPermission(['manageAssignments', 'viewReports']),
  validate(assignmentClassReportParamsSchema),
  AssignmentsController.getClassReport
);
router.get(
  '/history/:uid',
  validate(assignmentHistoryParamsSchema),
  AssignmentsController.getHistory
);
router.get(
  '/submissions/:assignmentId',
  requirePermission('manageAssignments'),
  validate(assignmentSubmissionsParamsSchema),
  AssignmentsController.getSubmissions
);
router.get('/:classId?', AssignmentsController.list);
router.post(
  ['/', '/create'],
  requirePermission('manageAssignments'),
  validate(createAssignmentSchema),
  AssignmentsController.create
);
router.delete(
  '/:id',
  requirePermission('manageAssignments'),
  validate(assignmentIdParamsSchema),
  AssignmentsController.archive
);
router.post(['/:id/submit', '/submit'], AssignmentsController.submit);
router.post(
  '/recheck',
  requirePermission('manageAssignments'),
  validate(recheckAssignmentSchema),
  AssignmentsController.recheck
);

export default router;
