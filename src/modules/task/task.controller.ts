import { NextFunction, Request, Response } from 'express';
import { TaskService } from './task.service';

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
}
