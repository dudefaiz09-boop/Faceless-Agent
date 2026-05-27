import { Router, type Router as ExpressRouter } from 'express';
import { DashboardController } from './dashboard.controller.js';

const router: ExpressRouter = Router();

router.get('/stats', DashboardController.getStats);
router.get('/attendance-trend', DashboardController.getAttendanceTrend);
router.get('/performance-trend', DashboardController.getPerformanceTrend);

export default router;
