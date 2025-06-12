import { FilterQuery, ProjectionFields, startSession, Types } from 'mongoose';
import { AppError } from '../../middleware/error.middleware';
import { Pagination } from '../../types/pagination';
import { AuditModel } from '../audit/audit.model';
import { AuditResult, IAuditInput } from '../audit/audit.types';
import { EvaluationModel } from '../evaluation/evaluation.model';
import { IEvaluationInput } from '../evaluation/evaluation.types';
import { FileModel } from '../file/file.model';
import { NoteModel } from '../note/note.model';
import { INoteInput } from '../note/note.types';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { IUser, UserModel } from '../user/user.model';
import { AuthUserType } from '../user/user.types';
import { ITask, TaskFormDataModel, TaskModel } from './task.model';
import { ICreateTaskInput, TaskStatus } from './task.types';
import {
  changeCountStatus,
  increaseCountNewTask,
} from '../../utils/redis.util';
import { SocketService } from '../socket/socket.service';
import { FormTemplateModel } from '../form/form.model';
import { FieldTypes } from '../form/form.types';
import { BranchService } from '../branch/branch.service';

export class TaskService {
  private notificationService: NotificationService;
  private socketService: SocketService;

  constructor() {
    this.notificationService = new NotificationService();
    this.socketService = new SocketService();
  }

  async createTask(input: ICreateTaskInput, user: IUser): Promise<ITask> {
    if (!input?.assignee) {
      throw new AppError(400, 'CreateTask', 'Хариуцагч сонгоогүй байна.');
    }

    if (input.assignee !== user.id && user.role === 'user') {
      throw new AppError(
        403,
        'Register user',
        'Та энэ үйлдлийг хийх эрхгүй байна.'
      );
    }

    // startDate < now
    let status = 'pending';
    const startDate = new Date(input.startDate);
    const now = new Date();
    if (startDate < now) {
      status = 'active';
    }

    const task = await TaskModel.create({
      priority: input.priority || 'medium',
      ...input,
      createdBy: user.id,
      status: status,
    });

    if (input.fileIds?.length) {
      await FileModel.updateMany(
        { _id: { $in: input.fileIds } },
        { $set: { task: task._id, isActive: true } }
      );
    }

    return task;
  }

  createTaskWithForm = async (
    taskInput: ICreateTaskInput,
    formValues: Record<string, any>,
    authUser: AuthUserType
  ) => {
    const session = await startSession();
    session.startTransaction();

    try {
      const user = await UserModel.findById(authUser.id);
      if (!user) {
        throw new AppError(404, 'CreateTask', 'Хэрэглэгч олдсонгүй');
      }

      const { formTemplateId, assignee } = taskInput;
      const task = await this.createTask(taskInput, user);

      const fields = Object.entries(formValues).map(([key, value]) => ({
        key,
        value,
      }));

      await TaskFormDataModel.create({
        taskId: task.id,
        formTemplateId,
        fields,
      });

      await session.commitTransaction();

      await increaseCountNewTask(task.status);
      this.socketService.broadcastDashboardStats();

      if (assignee !== authUser.id) {
        await this.notificationService.createNotification({
          title: 'Шинэ даалгавар',
          type: NotificationType.TASK,
          message: `${user?.rank} ${user.givenname} танд "${task.title}" даалгаврыг хуваариллаа.`,
          userId: assignee,
          taskId: task.id,
        });
      }

      return task;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  };

  async addFileToTask(taskId: string, fileId: string) {
    const file = await FileModel.findById(fileId);

    if (!file) {
      throw new AppError(404, 'Add File To Task', 'Файл олдсонгүй');
    }

    file.task = new Types.ObjectId(taskId);
    file.isActive = true;

    await file.save();

    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new AppError(404, 'Add File To Task', 'Даалгавар олдсонгүй');
    }

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== file.uploadedBy.toString());

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: 'Файл нэмэгдлээ',
        type: NotificationType.TASK,
        message: `"${task.title}" даалгаварт файл хавсаргасан`,
        userId,
        taskId: task.id,
      });
    }

    return file;
  }

  async startTask(taskId: string, authUser: AuthUserType) {
    const user = await UserModel.findById(authUser.id);
    if (!user) {
      throw new AppError(404, 'StartTask', 'Хэрэглэгч олдсонгүй');
    }
    const task = await TaskModel.findById(taskId);
    if (!task) throw new AppError(404, 'StartTask', 'Даалгавар олдсонгүй');
    if (task.assignee !== user.id)
      throw new AppError(
        403,
        'StartTask',
        'Та энэ даалгаварт хуваарилагдаагүй байна'
      );
    if (![TaskStatus.PENDING, TaskStatus.ACTIVE].includes(task.status))
      throw new AppError(
        400,
        'CompleteTask',
        'Тус даалгаварыг эхлүүлэх боломжгүй төлөвт байна.'
      );

    const currentStatus = task.status;
    const newStatus = TaskStatus.IN_PROGRESS;
    task.status = newStatus;
    await task.save();
    await changeCountStatus(currentStatus, newStatus);
    this.socketService.broadcastDashboardStats();

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== user.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: 'Даалгавар эхэлсэн',
        type: NotificationType.TASK,
        message: `${user?.rank} ${user.givenname} "${task.title}" даалгаврыг эхлүүлсэн`,
        userId,
        taskId: task.id,
      });
    }

    return task;
  }

  async completeTask(taskId: string, authUser: AuthUserType) {
    const user = await UserModel.findById(authUser.id);
    if (!user) {
      throw new AppError(404, 'CompleteTask', 'Хэрэглэгч олдсонгүй');
    }
    const task = await TaskModel.findById(taskId);
    if (!task) throw new AppError(404, 'CompleteTask', 'Даалгавар олдсонгүй');
    if (task.assignee !== user.id)
      throw new AppError(
        403,
        'CompleteTask',
        'Та энэ даалгаварт хуваарилагдаагүй байна'
      );
    if (task.status !== TaskStatus.IN_PROGRESS)
      throw new AppError(
        400,
        'CompleteTask',
        'Тус даалгавар дуусгах боломжгүй төлөвт байна.'
      );

    const currentStatus = task.status;
    const newStatus = TaskStatus.COMPLETED;
    task.status = newStatus;
    await task.save();
    await changeCountStatus(currentStatus, newStatus);
    this.socketService.broadcastDashboardStats();

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: 'Даалгавар дууссан',
        type: NotificationType.TASK,
        message: `${user?.rank} ${user.givenname} "${task.title}" даалгаврыг дуусгасан`,
        userId,
        taskId: task.id,
      });
    }

    return task;
  }

  async addNote(input: INoteInput, authUser: AuthUserType) {
    const task = await TaskModel.findById(input.taskId);
    if (!task) throw new AppError(404, 'AddNote', 'Даалгавар олдсонгүй');
    if ([TaskStatus.COMPLETED, TaskStatus.REVIEWED].includes(task.status)) {
      throw new AppError(
        400,
        'AddNote',
        'Дууссан эсвэл хянагдсан даалгаварт тэмдэглэл нэмэх боломжгүй'
      );
    }
    const note = await NoteModel.create(input);

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: 'Тэмдэглэл нэмэгдлээ',
        type: NotificationType.TASK,
        message: `Даалгаварт шинэ тэмдэглэл нэмэгдсэн`,
        userId,
        taskId: task.id,
      });
    }

    return note;
  }

  async auditTask(input: IAuditInput, authUser: AuthUserType) {
    const task = await TaskModel.findById(input.taskId);
    if (!task || task.status !== TaskStatus.COMPLETED) {
      throw new AppError(
        400,
        'AuditTask',
        'Даалгавар дууссан төлөвтэй байх ёстой'
      );
    }
    const audit = await AuditModel.create({ ...input, checkedBy: authUser.id });

    const currentStatus = task.status;
    const newStatus =
      input.result === AuditResult.APPROVED
        ? TaskStatus.REVIEWED
        : TaskStatus.IN_PROGRESS;
    task.status = newStatus;
    await task.save();
    await changeCountStatus(currentStatus, newStatus);
    this.socketService.broadcastDashboardStats();

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: 'Даалгавар хянагдсан',
        type: NotificationType.TASK,
        message: `Таны даалгавар ${
          input.result === AuditResult.APPROVED ? 'зөвшөөрөгдсөн' : 'буцаагдсан'
        }`,
        userId,
        taskId: task.id,
      });
    }

    return audit;
  }

  async evaluateTask(input: IEvaluationInput, authUser: AuthUserType) {
    const task = await TaskModel.findById(input.taskId);
    if (!task || task.status !== 'reviewed') {
      throw new AppError(
        400,
        'EvaluateTask',
        'Даалгавар хянагдсан төлөвтэй байх ёстой'
      );
    }
    const evaluation = await EvaluationModel.create({
      ...input,
      evaluator: authUser.id,
    });

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: 'Даалгавар үнэлэгдсэн',
        type: NotificationType.TASK,
        message: `Таны даалгаврыг үнэллээ: ${input.score} оноо`,
        userId: userId.toString(),
        taskId: task.id,
      });
    }

    return evaluation;
  }

  getList = async (
    {
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortDirection = 'desc',
      filters = {},
    }: Pagination & {
      filters?: FilterQuery<ITask>;
    },
    branchId: string
  ) => {
    const skip = (page - 1) * pageSize;
    if (branchId) {
      const branchService = new BranchService();
      const branches = await branchService.getBranchWithChildren(branchId);

      filters.branchId = {
        $in: branches?.map((b) => b._id) || [branchId],
      };
    }

    console.log(filters);
    // const template = await FormTemplateModel.findById(templateId);

    // if (!template) {
    //   throw new AppError(404, 'getTaskList', 'Ажлын төрөл олдсонгүй');
    // }

    // const showKeys = template.fields
    //   .filter((f: any) => f.showInTable)
    //   .map((f: any) => f.name);

    // const taskFormData = await TaskFormDataModel.find({
    //   formTemplateId: templateId,
    // }).lean();

    const tasks = await TaskModel.find(filters)
      .select('-__v -createdAt -updatedAt')
      .populate('assignee', '_id givenname surname position rank')
      .populate('createdBy', '_id givenname surname position rank')
      .populate('formTemplateId', '_id name')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(pageSize);

    const total = await TaskModel.countDocuments(filters);

    return {
      currentPage: page,
      rows: tasks,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  };

  async getTaskDetail(taskId: string) {
    const task = await TaskModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(taskId) },
      },
      {
        $lookup: {
          from: 'taskformdatas',
          localField: '_id',
          foreignField: 'taskId',
          as: 'formData',
        },
      },
      {
        $lookup: {
          from: 'formtemplates',
          let: {
            formTemplateId: { $arrayElemAt: ['$formData.formTemplateId', 0] },
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$formTemplateId'] },
              },
            },
          ],
          as: 'formTemplate',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignee',
          foreignField: '_id',
          as: 'assignee',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      {
        $lookup: {
          from: 'files',
          localField: '_id',
          foreignField: 'task',
          as: 'files',
        },
      },
      {
        $lookup: {
          from: 'evaluations',
          localField: '_id',
          foreignField: 'task',
          as: 'evaluations',
        },
      },
      {
        $addFields: {
          formTemplate: { $arrayElemAt: ['$formTemplate', 0] },
          assignee: { $arrayElemAt: ['$assignee', 0] },
          createdBy: { $arrayElemAt: ['$createdBy', 0] },
          formData: { $arrayElemAt: ['$formData', 0] },
        },
      },
      {
        $addFields: {
          formValues: {
            $map: {
              input: {
                $filter: {
                  input: '$formData.fields',
                  as: 'f',
                  cond: { $ne: ['$$f.value', null] },
                },
              },
              as: 'f',
              in: {
                $let: {
                  vars: {
                    labelObj: {
                      $first: {
                        $filter: {
                          input: '$formTemplate.fields',
                          as: 'templateField',
                          cond: {
                            $eq: [
                              { $toLower: '$$templateField.name' },
                              { $toLower: '$$f.key' },
                            ],
                          },
                        },
                      },
                    },
                  },
                  in: {
                    label: {
                      $cond: {
                        if: { $gt: ['$$labelObj', null] },
                        then: '$$labelObj.label',
                        else: '$$f.key',
                      },
                    },
                    value: '$$f.value',
                    type: {
                      $cond: {
                        if: { $gt: ['$$labelObj', null] },
                        then: '$$labelObj.type',
                        else: 'text',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          formData: 0,
          formTemplate: 0,
          'assignee.password': 0,
          'assignee.updateAt': 0,
          'assignee.__v': 0,
          'assignee.role': 0,
          'createdBy.password': 0,
          'createdBy.updatedAt': 0,
          'createdBy.__v': 0,
          'createdBy.role': 0,
          __v: 0,
          updatedAt: 0,
        },
      },
    ]);
    if (!task || task?.length < 1)
      throw new AppError(404, 'TaskDetail', 'Даалгавар олдсонгүй');
    return task[0];
  }

  getTasksWithFormSearch = async (
    authUser: AuthUserType,
    formTemplateId: string,
    {
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    }: Pagination,
    { search, me }: { search?: string; me?: string },
    query?: Record<string, any>
  ) => {
    const matchFilters: any[] = [];

    const template = await FormTemplateModel.findById(formTemplateId);
    if (!template) {
      throw new AppError(404, 'task list', 'Төрлийн мэдээлэл олдсонгүй');
    }

    const branchService = new BranchService();
    const branches = await branchService.getBranchWithChildren(
      authUser.branchId
    );
    console.log('branches ', branches);
    const showFields = template.fields.filter((f) => f.showInTable === true);
    const showKeys = showFields.map((f) => f.name);
    const searchTextFields = showFields
      .filter(
        (f) =>
          f.type === FieldTypes.TEXT_INPUT || f.type === FieldTypes.TEXTAREA
      )
      .map((f) => f.name);

    let rootMatchQuery: any = {};
    if (search) {
      if (searchTextFields?.length > 0 && me !== 'true') {
        const regexOrConditions: any = searchTextFields.map((name) => {
          return {
            'formData.fields': {
              $elemMatch: {
                key: name,
                value: {
                  $regex: search,
                  $options: 'i',
                },
              },
            },
          };
        });
        regexOrConditions.push({
          title: {
            $regex: search,
            $options: 'i',
          },
        });
        matchFilters.push({ $or: regexOrConditions });
      } else {
        rootMatchQuery = {
          $text: { $search: '324' },
        };
      }
    }

    if (me === 'true') {
      rootMatchQuery = {
        ...rootMatchQuery,
        assignee: authUser.id,
      };
    }

    if (query) {
      const queryKeys = Object.keys(query);
      queryKeys.map((key) => {
        if (query[key]) {
          matchFilters.push({
            'formData.fields': {
              $elemMatch: {
                key: key,
                value: query[key],
              },
            },
          });
        }
      });
    }

    const sortNumber = sortDirection === 'asc' ? 1 : -1;

    let project: ProjectionFields<ITask> = {
      title: 1,
      status: 1,
      startDate: 1,
      endDate: 1,
      priority: 1,
      assignee: {
        _id: 1,
        givenname: 1,
        surname: 1, // Хэрэгтэй талбаруудаа сонгоорой
        profileImageUrl: 1,
      },
      createdBy: {
        _id: 1,
        givenname: 1,
        surname: 1, // Хэрэгтэй талбаруудаа сонгоорой
        profileImageUrl: 1,
      },
    };

    if (showKeys.length > 0 && me !== 'true') {
      project = {
        ...project,
        formValues: {
          $arrayToObject: {
            $map: {
              input: {
                $filter: {
                  input: { $arrayElemAt: ['$formData.fields', 0] },
                  as: 'f',
                  cond: { $in: ['$$f.key', showKeys] },
                },
              },
              as: 'f',
              in: ['$$f.key', '$$f.value'],
            },
          },
        },
      };
    }

    const data = await TaskModel.aggregate([
      {
        $match: {
          branchId: {
            $in: branches?.map((b) => b._id) || [authUser.branchId],
          },
          formTemplateId: new Types.ObjectId(formTemplateId),
          ...rootMatchQuery,
        },
      },
      {
        $lookup: {
          from: 'taskformdatas',
          localField: '_id',
          foreignField: 'taskId',
          as: 'formData',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignee',
          foreignField: '_id',
          as: 'assignee',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      {
        $unwind: {
          path: '$assignee',
        },
      },
      {
        $unwind: {
          path: '$createdBy',
        },
      },
      ...(matchFilters.length > 0 ? [{ $match: { $and: matchFilters } }] : []),
      { $sort: { [sortBy]: sortNumber } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      {
        $project: project,
      },
    ]);

    return {
      currentPage: page,
      rows: data,
      total: 1,
      totalPages: 1,
    };
  };
}
