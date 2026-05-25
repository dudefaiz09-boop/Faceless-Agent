import { Router } from 'express';
import { RolesController } from './roles.controller.js';
import { validate } from '../../middleware/validate.js';
import { updateRoleSchema } from './roles.validation.js';
import { requireAnyRole } from '../../middleware/permissions.js';

const router: Router = Router();

router.post(
  '/',
  requireAnyRole(['admin', 'super_admin']),
  validate(updateRoleSchema),
  RolesController.update
);

export default router;
