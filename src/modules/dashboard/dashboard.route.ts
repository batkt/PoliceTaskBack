import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { DashboardController } from './dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

// Auth routes
router.get(
  '/taskCounts',
  authenticate,
  dashboardController.getTaskStatusCounts
);

export { router as dashboardRouter };
