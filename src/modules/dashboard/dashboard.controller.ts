import { NextFunction, Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

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
}
