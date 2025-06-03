import { NextFunction, Request, Response } from 'express';
import { TaskService } from './task.service';
import { ITask } from './task.model';
import { FilterQuery } from 'mongoose';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  createMemoTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const task = await this.taskService.createMemoTask(authUser, req.body);
      res.status(201).json({
        code: 200,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  createWorkGroupTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUser = req.user!;
      const task = await this.taskService.createWorkGroupTask(
        authUser,
        req.body
      );
      res.status(201).json({
        code: 200,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query?.status as string;
      const task = await this.taskService.getAll(status);
      res.status(201).json({
        code: 200,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  getList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sort = (req.query.sort as string) || 'createdAt';
      const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
      const status = req.query.status as string;
      const me = req.query.onlyMe as string;

      let filters: FilterQuery<ITask> = {};
      if (status && status !== 'all') {
        filters.status = status;
      }

      if (me && me === 'true') {
        filters.assigner = authUser.id;
      }

      const tasks = await this.taskService.getList({
        page,
        pageSize,
        sortBy: sort,
        sortDirection: order,
        filters,
      });

      res.status(201).json({
        code: 200,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  };
}
