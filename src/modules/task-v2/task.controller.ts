import { NextFunction, Request, Response } from 'express';
import { TaskService } from './task.service';
import { FilterQuery, Types } from 'mongoose';
import { ITask } from './task.model';
import { AdminActions, UserActions } from '../../types/roles';
import {
  canAccess,
  getAccessibleBranches,
} from '../../middleware/permission.middleware';
import { AppError } from '../../middleware/error.middleware';

export class TaskController {
  private taskService = new TaskService();

  private handleSuccess(res: Response, data: any, code = 200) {
    res.status(code).json({ code, data });
  }

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { formValues, ...input } = req.body;

      if (!input?.assignee) {
        throw new AppError(400, 'Create Task', 'Хариуцагч сонгоогүй байна.');
      }

      const action =
        authUser.id === input?.assignee
          ? UserActions.CREATE_OWN_TASK
          : AdminActions.CREATE_TASK;

      if (!canAccess(authUser, action)) {
        throw new AppError(
          403,
          'Create task',
          'Та энэ үйлдлийг хийх эрхгүй байна.'
        );
      }

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
      const authUser = req.user!;
      const { taskId, fileIds } = req.body;

      if (
        !canAccess(
          authUser,
          authUser.role === 'user'
            ? UserActions.ATTACH_FILE_OWN_TASK
            : AdminActions.ATTACH_FILE_TASK
        )
      ) {
        throw new AppError(
          403,
          'Attach file',
          'Та энэ үйлдлийг хийх эрхгүй байна.'
        );
      }

      const file = await this.taskService.addFileToTask(
        authUser,
        taskId,
        fileIds
      );
      this.handleSuccess(res, file);
    } catch (error) {
      next(error);
    }
  }

  removeFileFromTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUser = req.user!;
      const { taskId, fileIds } = req.body;

      const file = await this.taskService.removeFileFromTask(
        authUser,
        taskId,
        fileIds
      );
      this.handleSuccess(res, file);
    } catch (error) {
      next(error);
    }
  };

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

      if (
        !canAccess(
          authUser,
          authUser.role === 'user'
            ? UserActions.NOTE_OWN_TASK
            : AdminActions.NOTE_TASK
        )
      ) {
        throw new AppError(
          403,
          'Add note',
          'Та энэ үйлдлийг хийх эрхгүй байна.'
        );
      }

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
  async assignTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;

      if (
        !canAccess(
          authUser,
          authUser.role === 'user'
            ? UserActions.ASSIGN_TASK
            : AdminActions.ASSIGN_TASK
        )
      ) {
        throw new AppError(
          403,
          'Add note',
          'Та энэ үйлдлийг хийх эрхгүй байна.'
        );
      }
      const note = await this.taskService.assignTask(authUser, req.body);
      this.handleSuccess(res, note);
    } catch (error) {
      next(error);
    }
  }

  async auditTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const { taskId, comments, result } = req.body;

      if (!canAccess(authUser, AdminActions.AUDIT_TASK)) {
        throw new AppError(
          403,
          'Audit task',
          'Та энэ үйлдлийг хийх эрхгүй байна.'
        );
      }

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

  getTasksWithFormSearch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUser = req.user!;
      const {
        page,
        pageSize,
        sort,
        order,
        formTemplateId,
        status,
        search,
        assignee,
        ...other
      } = req.query;
      const _page = parseInt(page as string) || 1;
      const _pageSize = parseInt(pageSize as string) || 10;
      const _sort = (sort as string) || 'createdAt';
      const _order = (order as string) === 'asc' ? 'asc' : 'desc';
      const _formTemplateId = formTemplateId as string;
      const _status = status as string;
      const _assignee = assignee as string;
      const _search = search as string;

      console.log(req.query);

      let filters: FilterQuery<ITask> = {};

      if (authUser.role === 'super-admin') {
        filters = {}; // unrestricted
      } else if (authUser.role === 'admin') {
        const branches = await getAccessibleBranches(authUser);
        filters = { branchId: { $in: branches } };
      } else {
        // user өөрийн даалгавар л үзнэ
        filters = { assignee: authUser.id };
      }

      if (_status && _status !== 'all') {
        filters.status = _status;
      }

      if (_assignee) {
        filters.assignee = new Types.ObjectId(_assignee);
      }

      const tasks = await this.taskService.getTasksWithFormSearch(
        {
          page: _page,
          pageSize: _pageSize,
          sortBy: _sort,
          sortDirection: _order,
          filters,
        },
        _formTemplateId,
        { search: _search },
        other
      );

      res.status(200).json({
        code: 200,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sort = (req.query.sort as string) || 'createdAt';
      const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
      const formTemplateId = req.query.formTemplateId as string;
      const status = req.query.status as string;
      const search = req.query.search as string;

      let filters: FilterQuery<ITask> = {
        assignee: authUser.id,
      };

      if (status && status !== 'all') {
        filters.status = status;
      }

      if (formTemplateId) {
        filters.formTemplateId = formTemplateId;
      }
      if (search) {
        filters.$text = {
          $search: search,
        };
      }

      const tasks = await this.taskService.getUserTasks({
        page,
        pageSize,
        sortBy: sort,
        sortDirection: order,
        filters,
      });

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
