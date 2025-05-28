import { AppError } from '../../middleware/error.middleware';
import { AuthUserType } from '../user/user.types';
import { MemoModel } from './memo/memo.model';
import { TaskModel } from './task.model';
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

    // Register new user
    const newTask = new TaskModel({
      ...taskData,
      createdBy: user.id,
    });

    await newTask.save();

    // Notification uusgeh

    return newTask.toObject();
  };

  createMemoTask = async (user: AuthUserType, taskData: CreateMemoTaskType) => {
    const {
      assigner,
      startDate,
      endDate,
      title,
      description,
      ...memoTaskData
    } = taskData;
    const newTask = await this.create(user, {
      title,
      description,
      assigner,
      startDate,
      endDate,
      type: 'memo',
    });

    await MemoModel.create({
      ...memoTaskData,
      task: newTask._id,
    });

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
      ...workGroupTaskData
    } = taskData;
    const newTask = await this.create(user, {
      title,
      description,
      assigner,
      startDate,
      endDate,
      type: 'work-group',
    });

    await WorkGroupModel.create({
      ...workGroupTaskData,
      task: newTask._id,
    });

    return newTask;
  };
  // getList = async ({
  //   page = 1,
  //   pageSize = 10,
  //   sortBy = '_id',
  //   sortDirection = 'desc',
  // }: Pagination) => {
  //   // Get users with pagination
  //   const skip = (page - 1) * pageSize;

  //   const users = await UserModel.find()
  //     .select('-password -__v -createdAt -updatedAt')
  //     .populate('branch', '_id name isParent')
  //     .sort({ [sortBy]: sortDirection })
  //     .skip(skip)
  //     .limit(pageSize);

  //   const total = await UserModel.countDocuments();

  //   return {
  //     currentPage: page,
  //     rows: users,
  //     total,
  //     totalPages: Math.ceil(total / pageSize),
  //   };
  // };
}
