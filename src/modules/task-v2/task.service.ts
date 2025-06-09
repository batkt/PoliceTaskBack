import { FilterQuery } from 'mongoose';
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
import { UserModel } from '../user/user.model';
import { AuthUserType } from '../user/user.types';
import { ITask, TaskModel } from './task.model';
import { ICreateTaskInput, TaskStatus } from './task.types';
import {
  changeCountStatus,
  increaseCountNewTask,
} from '../../utils/redis.util';
import { SocketService } from '../socket/socket.service';

export class TaskService {
  private notificationService: NotificationService;
  private socketService: SocketService;

  constructor() {
    this.notificationService = new NotificationService();
    this.socketService = new SocketService();
  }

  async createTask(input: ICreateTaskInput, authUser: AuthUserType) {
    const user = await UserModel.findById(authUser.id);
    if (!user) {
      throw new AppError(404, 'CreateTask', 'Хэрэглэгч олдсонгүй');
    }
    if (!(input?.assignees?.length > 0)) {
      throw new AppError(400, 'CreateTask', 'Хариуцагч сонгоогүй байна.');
    }

    if (!(input.assignees.includes(user.id) || user.role !== 'user')) {
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
      createdBy: authUser.id,
      status: status,
    });

    if (input.fileIds?.length) {
      await FileModel.updateMany(
        { _id: { $in: input.fileIds } },
        { $set: { task: task._id, isActive: true } }
      );
    }

    await increaseCountNewTask(status);
    this.socketService.broadcastDashboardStats();

    const recipients = input.assignees.filter((id) => id !== authUser.id);
    for (const assigneeId of recipients) {
      await this.notificationService.createNotification({
        title: 'Шинэ даалгавар',
        type: NotificationType.TASK,
        message: `${user?.rank} ${user.givenname} танд "${task.title}" даалгаврыг хуваариллаа.`,
        userId: assigneeId,
        taskId: task.id,
      });
    }

    return task;
  }

  async addFileToTask(taskId: string, fileId: string) {
    const file = await FileModel.findByIdAndUpdate(
      fileId,
      { $set: { task: taskId, isActive: true } },
      { new: true }
    );

    const task = await TaskModel.findById(taskId);
    if (task) {
      const recipients = [
        task.createdBy!.toString(),
        ...task.assignees.map((id) => id.toString()),
      ].filter((id) => id !== file?.uploadedBy?.toString());

      for (const userId of recipients) {
        await this.notificationService.createNotification({
          title: 'Файл нэмэгдлээ',
          type: NotificationType.TASK,
          message: `"${task.title}" даалгаварт файл хавсаргасан`,
          userId,
          taskId: task.id,
        });
      }
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
    if (!task.assignees.includes(user.id))
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
      task.createdBy!.toString(),
      ...task.assignees.map((id) => id.toString()),
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
    if (!task.assignees.includes(user.id))
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
      task.createdBy!.toString(),
      ...task.assignees.map((id) => id.toString()),
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
      task.createdBy!.toString(),
      ...task.assignees.map((id) => id.toString()),
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

    const recipients =
      authUser.id === task.createdBy!.toString()
        ? task.assignees.map((id) => id.toString())
        : [
            task.createdBy!.toString(),
            ...task.assignees.map((id) => id.toString()),
          ];

    for (const userId of recipients.filter((id) => id !== authUser.id)) {
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

    for (const userId of task.assignees) {
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
      .populate('assignees', '_id givenname surname position rank')
      .populate('createdBy', '_id givenname surname position rank')
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
    const task = await TaskModel.findById(taskId)
      .populate('assignees')
      .populate('createdBy')
      .populate('files')
      .populate('evaluations')
      .lean();
    if (!task) throw new AppError(404, 'TaskDetail', 'Даалгавар олдсонгүй');
    return task;
  }
}
