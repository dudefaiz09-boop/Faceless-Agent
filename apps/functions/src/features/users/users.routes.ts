import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  listUsersQuerySchema,
  auditLogsQuerySchema,
  createManagedUserSchema,
  bulkManagedUsersSchema,
  updateManagedUserSchema,
  userParamsSchema,
  updateOwnProfileSchema,
} from './users.validation.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get('/', requirePermission('manageUsers'), UsersController.list);
router.get('/tenants', requirePermission('manageUsers'), UsersController.listTenants);
router.get('/audit-logs', requirePermission('manageUsers'), UsersController.getAuditLogs);
router.put('/profile', validate(updateOwnProfileSchema), UsersController.updateOwnProfile);
router.post(
  '/create',
  requirePermission('manageUsers'),
  validate(createManagedUserSchema),
  UsersController.create
);
router.post(
  '/bulk-import',
  requirePermission('manageUsers'),
  validate(bulkManagedUsersSchema),
  UsersController.bulkImport
);
router.post(
  '/import-csv',
  requirePermission('manageUsers'),
  validate(bulkManagedUsersSchema),
  UsersController.importCsv
);
router.put(
  '/:uid',
  requirePermission('manageUsers'),
  validate(updateManagedUserSchema),
  UsersController.update
);
router.patch(
  '/:uid/deactivate',
  requirePermission('manageUsers'),
  validate(userParamsSchema),
  UsersController.deactivate
);
router.delete(
  '/:uid',
  requirePermission('manageUsers'),
  validate(userParamsSchema),
  UsersController.deleteRequest
);

export default router;
