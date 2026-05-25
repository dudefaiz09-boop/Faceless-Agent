import { Router } from 'express';
import { NotificationsController } from './notifications.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createNotificationSchema,
  notificationIdParamsSchema,
} from './notifications.validation.js';
import { requireAnyRole } from '../../middleware/permissions.js';

const router: Router = Router();

router.get('/', NotificationsController.list);
router.post(
  '/',
  requireAnyRole(['admin', 'principal', 'super_admin']),
  validate(createNotificationSchema),
  NotificationsController.create
);
router.patch('/read-all', NotificationsController.markAllRead);
router.patch('/:id/read', validate(notificationIdParamsSchema), NotificationsController.markRead);
router.delete('/read', NotificationsController.archiveRead);
router.delete('/:id', validate(notificationIdParamsSchema), NotificationsController.archive);

export default router;
