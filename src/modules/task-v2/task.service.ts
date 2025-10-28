import { FilterQuery, ProjectionFields, startSession, Types } from "mongoose";
import { AppError } from "../../middleware/error.middleware";
import { Pagination } from "../../types/pagination";
import { AuditModel } from "../audit/audit.model";
import { AuditResult, IAuditInput } from "../audit/audit.types";
import { EvaluationModel } from "../evaluation/evaluation.model";
import { IEvaluationInput } from "../evaluation/evaluation.types";
import { FileModel } from "../file/file.model";
import { NoteModel } from "../note/note.model";
import { INoteInput } from "../note/note.types";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.types";
import { IUser, UserModel } from "../user/user.model";
import { AuthUserType } from "../user/user.types";
import { ITask, TaskFormDataModel, TaskModel } from "./task.model";
import { ICreateTaskInput, TaskStatus } from "./task.types";
import {
  changeCountStatus,
  increaseCountNewTask,
} from "../../utils/redis.util";
import { SocketService } from "../socket/socket.service";
import { FormTemplateModel } from "../form/form.model";
import { FieldTypes } from "../form/form.types";
import {
  generateActivityMessage,
  logTaskActivity,
} from "../activity/activity.service";
import { getAccessibleBranches } from "../../middleware/permission.middleware";
import { getRankWithName } from "../../utils/user.util";
import { pipeline } from "stream";

export class TaskService {
  private notificationService: NotificationService;
  private socketService: SocketService;

  constructor() {
    this.notificationService = new NotificationService();
    this.socketService = new SocketService();
  }

  private async createTask(
    input: ICreateTaskInput,
    user: IUser
  ): Promise<ITask> {
    // startDate < now
    let status = "pending";
    const startDate = new Date(input.startDate);
    const now = new Date();
    if (startDate < now) {
      status = "active";
    }

    const task = await TaskModel.create({
      priority: input.priority || "medium",
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
        throw new AppError(404, "Create Task", "Хэрэглэгч олдсонгүй");
      }

      const assignUser = await UserModel.findById(taskInput.assignee);

      if (!assignUser) {
        throw new AppError(400, "Create Task", "Хүлээн авагч олдсонгүй.");
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

      await logTaskActivity(
        task.id,
        user.id,
        "created",
        generateActivityMessage("created")
      );

      await logTaskActivity(
        task.id,
        authUser.id,
        "assigned",
        generateActivityMessage("assigned", getRankWithName(assignUser))
      );

      await logTaskActivity(
        task.id,
        user.id,
        "status-changed",
        generateActivityMessage(
          "status-changed",
          task.status === "active" ? "Идэвхитэй" : "Хүлээгдэж байгаа"
        )
      );

      await session.commitTransaction();

      await increaseCountNewTask(task.status);
      this.socketService.broadcastDashboardStats();

      if (assignee !== authUser.id) {
        await this.notificationService.createNotification({
          title: "Шинэ даалгавар",
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

  async addFileToTask(
    authUser: AuthUserType,
    taskId: string,
    fileIds: string[]
  ) {
    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new AppError(404, "Add File To Task", "Даалгавар олдсонгүй");
    }

    if (authUser.role === "user" && task.assignee.toString() !== authUser.id) {
      throw new AppError(
        403,
        "Attach file",
        "Та энэ үйлдлийг хийх эрхгүй байна."
      );
    }

    const updated = await FileModel.updateMany(
      {
        _id: {
          $in: fileIds,
        },
      },
      {
        $set: {
          task: new Types.ObjectId(taskId),
          isActive: true,
        },
      }
    );

    await logTaskActivity(
      task.id,
      authUser.id,
      "file-attached",
      generateActivityMessage("file-attached")
    );

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: "Файл нэмэгдлээ",
        type: NotificationType.TASK,
        message: `"${task.title}" даалгаварт файл хавсаргасан`,
        userId,
        taskId: task.id,
      });
    }

    const files = await FileModel.find({
      task: taskId,
    })
      .select("-__v")
      .lean();

    return files;
  }

  removeFileFromTask = async (
    authUser: AuthUserType,
    taskId: string,
    fileIds: string[]
  ) => {
    const task = await TaskModel.findById(taskId);
    if (!task) {
      throw new AppError(404, "Add File To Task", "Даалгавар олдсонгүй");
    }

    const updated = await FileModel.updateMany(
      {
        _id: {
          $in: fileIds,
        },
      },
      {
        $set: {
          task: null,
          isActive: false,
        },
      }
    );

    await logTaskActivity(
      task.id,
      authUser.id,
      "file-deleted",
      generateActivityMessage("file-deleted")
    );

    const files = await FileModel.find({
      task: taskId,
    })
      .select("-__v")
      .lean();

    return files;
  };

  async startTask(taskId: string, authUser: AuthUserType) {
    const user = await UserModel.findById(authUser.id);
    if (!user) {
      throw new AppError(404, "StartTask", "Хэрэглэгч олдсонгүй");
    }
    const task = await TaskModel.findById(taskId);
    if (!task) throw new AppError(404, "StartTask", "Даалгавар олдсонгүй");
    if (task.assignee.toString() !== user.id)
      throw new AppError(
        403,
        "StartTask",
        "Та энэ даалгаварт хуваарилагдаагүй байна"
      );
    if (![TaskStatus.PENDING, TaskStatus.ACTIVE].includes(task.status))
      throw new AppError(
        400,
        "CompleteTask",
        "Тус даалгаварыг эхлүүлэх боломжгүй төлөвт байна."
      );

    const currentStatus = task.status;
    const newStatus = TaskStatus.IN_PROGRESS;
    task.status = newStatus;
    await task.save();
    await changeCountStatus(currentStatus, newStatus);
    this.socketService.broadcastDashboardStats();

    await logTaskActivity(
      task.id,
      authUser.id,
      "status-changed",
      generateActivityMessage("status-changed", "Хийгдэж байгаа")
    );

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== user.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: "Даалгавар эхэлсэн",
        type: NotificationType.TASK,
        message: `${user?.rank} ${user.givenname} "${task.title}" даалгаврыг эхлүүлсэн`,
        userId,
        taskId: task.id,
      });
    }

    return task;
  }

  async completeTask(
    authUser: AuthUserType,
    data: {
      taskId: string;
      summary: string;
    }
  ) {
    const user = await UserModel.findById(authUser.id);
    if (!user) {
      throw new AppError(404, "CompleteTask", "Хэрэглэгч олдсонгүй");
    }
    const task = await TaskModel.findById(data.taskId);
    if (!task) throw new AppError(404, "CompleteTask", "Даалгавар олдсонгүй");
    if (task.assignee.toString() !== user.id)
      throw new AppError(
        403,
        "CompleteTask",
        "Та энэ даалгаварт хуваарилагдаагүй байна"
      );
    if (task.status !== TaskStatus.IN_PROGRESS)
      throw new AppError(
        400,
        "CompleteTask",
        "Тус даалгавар дуусгах боломжгүй төлөвт байна."
      );

    await logTaskActivity(
      task.id,
      user.id,
      "status-changed",
      generateActivityMessage("status-changed", "Дууссан")
    );

    const currentStatus = task.status;
    const newStatus = TaskStatus.COMPLETED;
    task.status = newStatus;
    task.summary = data.summary;
    task.completedDate = new Date();
    await task.save();
    await changeCountStatus(currentStatus, newStatus);
    this.socketService.broadcastDashboardStats();

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: "Даалгавар дууссан",
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
    if (!task) {
      throw new AppError(404, "Add note", "Даалгавар олдсонгүй");
    }

    const branches = await getAccessibleBranches(authUser);
    if (!branches.includes("*")) {
      if (!branches.includes(task.branchId.toString())) {
        throw new AppError(
          403,
          "Add note",
          "Та энэ үйлдлийг хийх эрхгүй байна."
        );
      }
    }

    if ([TaskStatus.COMPLETED, TaskStatus.REVIEWED].includes(task.status)) {
      throw new AppError(
        400,
        "AddNote",
        "Дууссан эсвэл хянагдсан даалгаварт тэмдэглэл нэмэх боломжгүй"
      );
    }
    const note = await NoteModel.create({
      content: input.content,
      task: input.taskId,
      createdBy: authUser.id,
    });

    await logTaskActivity(
      task.id,
      authUser.id,
      "commented",
      generateActivityMessage("commented")
    );

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: "Тэмдэглэл нэмэгдлээ",
        type: NotificationType.TASK,
        message: `Даалгаварт шинэ тэмдэглэл нэмэгдсэн`,
        userId,
        taskId: task.id,
      });
    }

    const newNote = await NoteModel.findById(note._id).populate(
      "createdBy",
      "_id givenname surname profileImageUrl rank position"
    );

    return newNote;
  }

  async auditTask(input: IAuditInput, authUser: AuthUserType) {
    const task = await TaskModel.findById(input.taskId);
    if (!task || task.status !== TaskStatus.COMPLETED) {
      throw new AppError(
        400,
        "AuditTask",
        "Даалгавар дууссан төлөвтэй байх ёстой"
      );
    }

    if (!task.supervisors.find((it) => it.toString() === authUser.id)) {
      throw new AppError(400, "AuditTask", "Та даалгаврыг хянах эрхгүй байна");
    }

    const audit = await AuditModel.create({
      task: input.taskId,
      comments: input.comments,
      point: input.point,
      result: input.result,
      checkedBy: authUser.id,
    });

    // const currentStatus = task.status;
    const newStatus =
      input.result === AuditResult.APPROVED
        ? TaskStatus.REVIEWED
        : TaskStatus.IN_PROGRESS;
    task.status = newStatus;
    await task.save();

    await logTaskActivity(
      input.taskId,
      authUser.id,
      "audited",
      generateActivityMessage(
        "audited",
        input.result === "approved"
          ? "зөвшөөрсөн"
          : `${
              input?.comments
                ? `"${input.comments}" шалтгааны улмаас татгалзсан`
                : "татгалзсан"
            }`
      )
    );

    // await changeCountStatus(currentStatus, newStatus);
    // this.socketService.broadcastDashboardStats();

    const recipients = [
      task.createdBy.toString(),
      task.assignee.toString(),
    ].filter((id) => id !== authUser.id);

    for (const userId of recipients) {
      await this.notificationService.createNotification({
        title: "Даалгавар хянагдсан",
        type: NotificationType.TASK,
        message: `Таны даалгавар ${
          input.result === AuditResult.APPROVED ? "зөвшөөрөгдсөн" : "буцаагдсан"
        }`,
        userId,
        taskId: task.id,
      });
    }

    return audit;
  }

  async evaluateTask(input: IEvaluationInput, authUser: AuthUserType) {
    const task = await TaskModel.findById(input.taskId);
    if (!task || task.status !== "reviewed") {
      throw new AppError(
        400,
        "EvaluateTask",
        "Даалгавар хянагдсан төлөвтэй байх ёстой"
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
        title: "Даалгавар үнэлэгдсэн",
        type: NotificationType.TASK,
        message: `Таны даалгаврыг үнэллээ: ${input.score} оноо`,
        userId: userId.toString(),
        taskId: task.id,
      });
    }

    return evaluation;
  }

  async assignTask(
    authUser: AuthUserType,
    data: {
      taskId: string;
      assignTo: string;
    }
  ) {
    const task = await TaskModel.findById(data.taskId);
    if (!task) {
      throw new AppError(400, "Assign task", "Даалгавар олдсонгүй.");
    }

    const user = await UserModel.findById(authUser.id);

    if (!user) {
      throw new AppError(400, "Assign task", "Хэрэглэгч олдсонгүй.");
    }

    const assignUser = await UserModel.findById(data.assignTo);

    if (!assignUser) {
      throw new AppError(400, "Assign task", "Хүлээн авагч олдсонгүй.");
    }

    task.assignee = new Types.ObjectId(data.assignTo);
    await task.save();

    await logTaskActivity(
      task.id,
      authUser.id,
      "assigned",
      generateActivityMessage("assigned", getRankWithName(assignUser))
    );

    await this.notificationService.createNotification({
      title: "Шинэ даалгавар",
      type: NotificationType.TASK,
      message: `${user?.rank} ${user.givenname} танд "${task.title}" даалгаврыг хуваариллаа.`,
      userId: data.assignTo,
      taskId: task.id,
    });

    return true;
  }

  async getTaskDetail(taskId: string) {
    const task = await TaskModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(taskId) },
      },
      {
        $lookup: {
          from: "taskformdatas",
          localField: "_id",
          foreignField: "taskId",
          as: "formData",
        },
      },
      {
        $lookup: {
          from: "formtemplates",
          let: {
            formTemplateId: { $arrayElemAt: ["$formData.formTemplateId", 0] },
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$formTemplateId"] },
              },
            },
          ],
          as: "formTemplate",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignee",
          foreignField: "_id",
          as: "assignee",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "supervisors",
          foreignField: "_id",
          as: "supervisorUsers",
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "_id",
          foreignField: "task",
          as: "files",
        },
      },
      {
        $lookup: {
          from: "evaluations",
          localField: "_id",
          foreignField: "task",
          as: "evaluations",
        },
      },
      {
        $addFields: {
          formTemplate: { $arrayElemAt: ["$formTemplate", 0] },
          assignee: { $arrayElemAt: ["$assignee", 0] },
          createdBy: { $arrayElemAt: ["$createdBy", 0] },
          formData: { $arrayElemAt: ["$formData", 0] },
        },
      },
      {
        $addFields: {
          formValues: {
            $map: {
              input: {
                $filter: {
                  input: "$formData.fields",
                  as: "f",
                  cond: { $ne: ["$$f.value", null] },
                },
              },
              as: "f",
              in: {
                $let: {
                  vars: {
                    labelObj: {
                      $first: {
                        $filter: {
                          input: "$formTemplate.fields",
                          as: "templateField",
                          cond: {
                            $eq: [
                              { $toLower: "$$templateField.name" },
                              { $toLower: "$$f.key" },
                            ],
                          },
                        },
                      },
                    },
                  },
                  in: {
                    label: {
                      $cond: {
                        if: { $gt: ["$$labelObj", null] },
                        then: "$$labelObj.label",
                        else: "$$f.key",
                      },
                    },
                    value: "$$f.value",
                    type: {
                      $cond: {
                        if: { $gt: ["$$labelObj", null] },
                        then: "$$labelObj.type",
                        else: "text",
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
          "assignee.password": 0,
          "assignee.updateAt": 0,
          "assignee.__v": 0,
          "assignee.role": 0,
          "createdBy.password": 0,
          "createdBy.updatedAt": 0,
          "createdBy.__v": 0,
          "createdBy.role": 0,
          __v: 0,
          updatedAt: 0,
        },
      },
    ]);
    if (!task || task?.length < 1)
      throw new AppError(404, "TaskDetail", "Даалгавар олдсонгүй");
    return task[0];
  }

  getTasksWithFormSearch = async (
    {
      page = 1,
      pageSize = 10,
      sortBy = "createdAt",
      sortDirection = "desc",
      filters = {},
    }: Pagination & { filters: FilterQuery<ITask> },
    formTemplateId: string,
    { search }: { search?: string },
    query?: Record<string, any>
  ) => {
    const matchFilters: any[] = [];
    let rootMatchQuery: FilterQuery<ITask> = filters;

    const template = await FormTemplateModel.findById(formTemplateId);
    if (!template) {
      throw new AppError(404, "task list", "Төрлийн мэдээлэл олдсонгүй");
    }

    const showFields = template.fields.filter((f) => f.showInTable === true);
    const showKeys = showFields.map((f) => f.name);
    const searchTextFields = showFields
      .filter(
        (f) =>
          f.type === FieldTypes.TEXT_INPUT || f.type === FieldTypes.TEXTAREA
      )
      .map((f) => f.name);

    if (search) {
      if (searchTextFields?.length > 0) {
        const regexOrConditions: any = searchTextFields.map((name) => {
          return {
            "formData.fields": {
              $elemMatch: {
                key: name,
                value: {
                  $regex: search,
                  $options: "i",
                },
              },
            },
          };
        });
        regexOrConditions.push({
          title: {
            $regex: search,
            $options: "i",
          },
        });
        matchFilters.push({ $or: regexOrConditions });
      }
    }

    if (query) {
      const queryKeys = Object.keys(query);
      queryKeys.map((key) => {
        if (query[key]) {
          matchFilters.push({
            "formData.fields": {
              $elemMatch: {
                key: key,
                value: query[key],
              },
            },
          });
        }
      });
    }

    const sortNumber = sortDirection === "asc" ? 1 : -1;

    let project: ProjectionFields<ITask> = {
      title: 1,
      status: 1,
      startDate: 1,
      dueDate: 1,
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

    if (showKeys.length > 0) {
      project = {
        ...project,
        formValues: {
          $arrayToObject: {
            $map: {
              input: {
                $filter: {
                  input: { $arrayElemAt: ["$formData.fields", 0] },
                  as: "f",
                  cond: { $in: ["$$f.key", showKeys] },
                },
              },
              as: "f",
              in: ["$$f.key", "$$f.value"],
            },
          },
        },
      };
    }

    const data = await TaskModel.aggregate([
      {
        $match: {
          formTemplateId: new Types.ObjectId(formTemplateId),
          ...rootMatchQuery,
        },
      },
      {
        $lookup: {
          from: "taskformdatas",
          localField: "_id",
          foreignField: "taskId",
          as: "formData",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignee",
          foreignField: "_id",
          as: "assignee",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $unwind: {
          path: "$assignee",
        },
      },
      {
        $unwind: {
          path: "$createdBy",
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

  getArchivedTasksFormSearch = async ({
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortDirection = "desc",
    filters = {},
  }: Pagination & { filters: FilterQuery<ITask> }) => {
    const skip = (page - 1) * pageSize;
    const tasks = await TaskModel.find(filters)
      .select("-__v -createdAt -updatedAt")
      .populate(
        "assignee",
        "_id givenname surname position rank profileImageUrl"
      )
      .populate(
        "createdBy",
        "_id givenname surname position rank profileImageUrl"
      )
      .populate("formTemplateId", "_id name")
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

  getUserTasks = async ({
    page = 1,
    pageSize = 10,
    sortBy = "createdAt",
    sortDirection = "desc",
    filters = {},
  }: Pagination & { filters: FilterQuery<ITask> }) => {
    const skip = (page - 1) * pageSize;

    const tasks = await TaskModel.find(filters)
      .select("-__v -createdAt -updatedAt")
      .populate(
        "assignee",
        "_id givenname surname position rank profileImageUrl"
      )
      .populate(
        "createdBy",
        "_id givenname surname position rank profileImageUrl"
      )
      .populate("formTemplateId", "_id name")
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

  getUserTasksWeek = async ({
    sortBy = "createdAt",
    sortDirection = "desc",
    filters = {},
  }: Pagination & { filters: FilterQuery<ITask> }) => {
    const tasks = await TaskModel.find(filters)
      .select("-__v -createdAt -updatedAt")
      .populate(
        "assignee",
        "_id givenname surname position rank profileImageUrl"
      )
      .populate(
        "createdBy",
        "_id givenname surname position rank profileImageUrl"
      )
      .populate("formTemplateId", "_id name")
      .sort({ [sortBy]: sortDirection });

    const total = await TaskModel.countDocuments(filters);

    return {
      rows: tasks,
      total,
    };
  };

  getTaskReport = async (
    authUser: AuthUserType,
    filters: {
      startDate: Date;
      endDate: Date;
    }
  ) => {
    const tasks = await AuditModel.aggregate([
      {
        $match: {
          result: "approved",
          createdAt: {
            $gte: filters.startDate,
            $lte: filters.endDate,
          },
        },
      },
      {
        $lookup: {
          from: "tasks",
          localField: "task",
          foreignField: "_id",
          as: "task",
        },
      },
      {
        $unwind: { path: "$task" },
      },
      {
        $match: {
          "task.assignee": new Types.ObjectId(authUser.id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "task.supervisors",
          foreignField: "_id",
          as: "task.supervisors",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "task.createdBy",
          foreignField: "_id",
          as: "task.createdBy",
        },
      },
      {
        $unwind: { path: "$task.createdBy", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "formtemplates",
          localField: "task.formTemplateId",
          foreignField: "_id",
          as: "task.formTemplate",
        },
      },
      {
        $unwind: {
          path: "$task.formTemplate",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "checkedBy",
          foreignField: "_id",
          as: "checkedBy",
        },
      },
      {
        $unwind: { path: "$checkedBy", preserveNullAndEmptyArrays: true },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          result: 1,
          comments: 1,
          point: 1,
          createdAt: 1,
          checkedBy: {
            _id: 1,
            givenname: 1,
            surname: 1,
            position: 1,
            rank: 1,
            profileImageUrl: 1,
          },
          task: {
            _id: 1,
            title: 1,
            status: 1,
            description: 1,
            startDate: 1,
            summary: 1,
            completedDate: 1,
            dueDate: 1,
            createdBy: {
              _id: 1,
              givenname: 1,
              surname: 1,
              position: 1,
              rank: 1,
              profileImageUrl: 1,
            },
            supervisors: {
              _id: 1,
              givenname: 1,
              surname: 1,
              position: 1,
              rank: 1,
              profileImageUrl: 1,
            },
            formTemplate: {
              _id: 1,
              name: 1,
            },
          },
        },
      },
    ]);

    return tasks;
  };
}
