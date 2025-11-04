import { NextFunction, Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { parseFilters } from '../../utils/filter.util';

const parseDateFilters = (req: Request) => {
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(new Date().setDate(new Date().getDate() - 30)); // Default: last 30 days

  const endDate = req.query.endDate
    ? new Date(req.query.endDate as string)
    : new Date();

  const branchId = req.query.branchId as string | undefined;
  const assigneeId = req.query.assigneeId as string | undefined;
  const status = req.query.status as string | undefined;

  return { startDate, endDate, branchId, assigneeId, status };
};

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getTaskStatusCounts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.dashboardService.getTaskStatusCounts();
      res.send({
        code: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getMasterDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const filters = parseDateFilters(req);

      // Role based filtering
      if (authUser.role === "admin") {
        filters.branchId = authUser.branchId;
      } else if (authUser.role === "user") {
        filters.assigneeId = authUser.id;
      }
      const dashboard = await this.dashboardService.getMasterDashboard(filters, authUser);
      res.send({
        code: 200,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  };

  getTopBottomPerformers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const filters = parseDateFilters(req);

      // Role based filtering
      const performers = await this.dashboardService.getTopBottomPerformers(
        filters,
        authUser
      );

      res.send({
        code: 200,
        data: performers,
      });
    } catch (error) {
      next(error);
    }
  };
}
