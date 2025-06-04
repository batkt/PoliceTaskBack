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
import { NotificationService } from '../notification/notification.service';

export class TaskService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

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

    if (user.id !== assigner) {
      await this.notificationService.createNotification({
        title: 'Төлөвлөгөө.',
        type: 'job',
        message: 'Танд "Албан бичиг" төрлийн шинэ төлөвлөгөө хуваариллаа.',
        userId: assigner,
        taskId: newTask?._id as string,
      });
    }
    return newTask;
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

    if (user.id !== assigner) {
      await this.notificationService.createNotification({
        title: 'Төлөвлөгөө.',
        type: 'job',
        message: 'Танд "Ажлын хэсэг" төрлийн шинэ төлөвлөгөө хуваариллаа.',
        userId: assigner,
        taskId: newTask?._id as string,
      });
    }
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
      .populate('createdBy', '_id givenname surname position rank')
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

  changeStatus = async (
    user: AuthUserType,
    data: {
      status: 'pending' | 'active' | 'processing' | 'completed';
      taskId: string;
    }
  ) => {
    const task = await TaskModel.findById(data.taskId);
    if (!task) {
      throw new AppError(404, 'Төлөвлөгөө', 'Төлөвлөгөө олдсонгүй.');
    }

    if (task.assigner.toString() !== user.id) {
      throw new AppError(
        403,
        'Төлөвлөгөө',
        'Хүний төлөвлөгөөг засах боломжгүй.'
      );
    }

    task.status = data.status;

    if (task.createdBy && task.createdBy?.toString() !== user.id) {
      await this.notificationService.createNotification({
        title: 'Төлөвлөгөө.',
        type: 'job',
        message: 'Төлөвлөгөөний төлөв өөрчлөгдлөө.',
        userId: task.createdBy.toString(),
        taskId: task?._id as string,
      });
    }
    // хадгална
    await task.save();
  };

  getMemoByTaskId = (taskId: string) => {
    return MemoModel.findOne({
      task: taskId,
    });
  };

  getWorkgroupByTaskId = async (taskId: string) => {
    const workGroup = await WorkGroupModel.findOne({ task: taskId })
      .populate('leader') // зөвхөн name талбарыг авах
      .populate('members') // name талбаруудыг авах
      .lean();

    return workGroup;
  };
}
