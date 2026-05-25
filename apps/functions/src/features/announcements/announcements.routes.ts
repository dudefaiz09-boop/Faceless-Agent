import { Router } from 'express';
import { AnnouncementsController } from './announcements.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createAnnouncementSchema,
  announcementIdParamsSchema,
} from './announcements.validation.js';
import { requirePermission } from '../../middleware/permissions.js';

const router: Router = Router();

router.get('/', AnnouncementsController.list);
router.post(
  '/',
  requirePermission('manageAnnouncements'),
  validate(createAnnouncementSchema),
  AnnouncementsController.create
);
router.delete(
  '/:id',
  requirePermission('manageAnnouncements'),
  validate(announcementIdParamsSchema),
  AnnouncementsController.archive
);

export default router;
