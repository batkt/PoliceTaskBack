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

router.get("/master", authenticate, dashboardController.getMasterDashboard);
router.get("/top-bottom-performers", authenticate, dashboardController.getTopBottomPerformers);

export { router as dashboardRouter };
