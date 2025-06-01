import { FilterQuery } from 'mongoose';
import { AppError } from '../../middleware/error.middleware';
import { Pagination } from '../../types/pagination';
import { AuthUserType } from '../user/user.types';
import { MemoModel } from './memo/memo.model';
import { ITask, TaskModel } from './task.model';
import {
  CreateMemoTaskType,
  CreateTaskType,
  CreateWorkGroupTaskType,
} from './task.types';
import { WorkGroupModel } from './work-group/work-group.mode';

export class TaskService {
  create = async (user: AuthUserType, taskData: CreateTaskType) => {
    if (
      taskData?.assigner &&
      user.id !== taskData.assigner &&
      user.role !== 'super-admin'
    ) {
      throw new AppError(
        403,
        'Register user',
        'Та энэ үйлдлийг хийх эрхгүй байна.'
      );
    }

    const startDate = new Date(taskData.startDate);
    const now = new Date();
    let status = 'pending';
    if (startDate < now) {
      status = 'active';
    }
    // Register new user
    const newTask = new TaskModel({
      ...taskData,
      status,
      createdBy: user.id,
    });

    await newTask.save();

    // // Notification uusgeh

    return newTask.toObject();
  };

  createMemoTask = async (user: AuthUserType, taskData: CreateMemoTaskType) => {
    const {
      assigner,
      startDate,
      endDate,
      title,
      description,
      priority,
      ...memoTaskData
    } = taskData;
    const newTask = await this.create(user, {
      title,
      description,
      assigner,
      startDate,
      endDate,
      type: 'memo',
      priority,
    });

    await MemoModel.create({
      ...memoTaskData,
      task: newTask._id,
    });

    return newTask;
    // return '';
  };

  createWorkGroupTask = async (
    user: AuthUserType,
    taskData: CreateWorkGroupTaskType
  ) => {
    const {
      assigner,
      startDate,
      endDate,
      title,
      description,
      priority,
      ...workGroupTaskData
    } = taskData;
    const newTask = await this.create(user, {
      title,
      description,
      assigner,
      startDate,
      endDate,
      type: 'work-group',
      priority,
    });

    await WorkGroupModel.create({
      ...workGroupTaskData,
      task: newTask._id,
    });

    return newTask;
  };

  getList = async ({
    page = 1,
    pageSize = 10,
    sortBy = 'createdAt',
    sortDirection = 'desc',
    filters = {},
  }: Pagination & {
    filters?: FilterQuery<ITask>;
  }) => {
    const skip = (page - 1) * pageSize;

    const tasks = await TaskModel.find(filters)
      .select('-__v -createdAt -updatedAt')
      .populate('assigner', '_id givenname surname position rank')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(pageSize);

    const total = await TaskModel.find(filters).countDocuments();

    return {
      currentPage: page,
      rows: tasks,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  };

  getAll = async (status?: string) => {
    const filter =
      status && status !== 'all'
        ? {
            status,
          }
        : {};
    console.log(filter);
    const tasks = TaskModel.find(filter)
      .populate({
        path: 'assigner',
        select: '_id givenname surname rank position workerId',
      })
      .sort({
        createdAt: 'desc',
      });
    return tasks;
  };
}
