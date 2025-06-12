import { NextFunction, Request, Response } from 'express';
import { TaskService } from './task.service';
import { FilterQuery, Types } from 'mongoose';
import { ITask } from './task.model';
import { escapeRegex } from '../../utils/filter.util';

export class TaskController {
  private taskService = new TaskService();

  private handleSuccess(res: Response, data: any, code = 200) {
    res.status(code).json({ code, data });
  }

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { formValues, ...input } = req.body;
      const task = await this.taskService.createTaskWithForm(
        input,
        formValues,
        authUser
      );
      this.handleSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async addFileToTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId, fileId } = req.body;
      const file = await this.taskService.addFileToTask(taskId, fileId);
      this.handleSuccess(res, file);
    } catch (error) {
      next(error);
    }
  }

  async startTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { taskId } = req.body;
      const task = await this.taskService.startTask(taskId, authUser);
      this.handleSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async completeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { taskId } = req.body;
      const task = await this.taskService.completeTask(taskId, authUser);
      this.handleSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { taskId, content } = req.body;
      const note = await this.taskService.addNote(
        {
          taskId,
          content,
        },
        authUser
      );
      this.handleSuccess(res, note);
    } catch (error) {
      next(error);
    }
  }

  async auditTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { taskId, comments, result } = req.body;
      const audit = await this.taskService.auditTask(
        {
          taskId,
          comments,
          result,
        },
        authUser
      );
      this.handleSuccess(res, audit);
    } catch (error) {
      next(error);
    }
  }

  async evaluateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { taskId, score, feedback } = req.body;
      const evalRes = await this.taskService.evaluateTask(
        {
          taskId,
          score,
          feedback,
        },
        authUser
      );
      this.handleSuccess(res, evalRes);
    } catch (error) {
      next(error);
    }
  }

  getTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sort = (req.query.sort as string) || 'createdAt';
      const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
      const status = req.query.status as string;
      const title = req.query.title as string;
      const me = req.query.onlyMe as string;

      let filters: FilterQuery<ITask> = {};
      if (status && status !== 'all') {
        filters.status = status;
      }

      if (title) {
        filters.title = { $regex: escapeRegex(title), $options: 'i' };
      }

      if (me === 'true') {
        filters.assignee = authUser.id;
      }

      const tasks = await this.taskService.getList(
        {
          page,
          pageSize,
          sortBy: sort,
          sortDirection: order,
          filters,
        },
        authUser.branchId
      );

      res.status(200).json({
        code: 200,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  };

  getTasksWithFormSearch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUser = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sort = (req.query.sort as string) || 'createdAt';
      const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
      const formTemplateId = req.query.formTemplateId as string;
      // const status = req.query.status as string;
      const search = req.query.search as string;
      const me = req.query.onlyMe as string;

      // let filters: FilterQuery<ITask> = {};
      // if (status && status !== 'all') {
      //   filters.status = status;
      // }

      // if (title) {
      //   filters.title = { $regex: escapeRegex(title), $options: 'i' };
      // }

      // if (me === 'true') {
      //   filters.assignees = {
      //     $in: authUser.id,
      //   };
      // }

      const tasks = await this.taskService.getTasksWithFormSearch(
        authUser,
        formTemplateId,
        {
          page,
          pageSize,
          sortBy: sort,
          sortDirection: order,
        },
        { search, me }
      );

      res.status(200).json({
        code: 200,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  };

  async getTaskDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const task = await this.taskService.getTaskDetail(taskId);
      this.handleSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }
}
