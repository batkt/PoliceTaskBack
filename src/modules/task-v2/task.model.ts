import { Document, model, Schema, Types } from "mongoose";
import { TaskStatus, TaskPriority, IFieldEntry } from "./task.types";

export interface ITask extends Document {
  assignee: Types.ObjectId;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  branchId: Types.ObjectId;
  formTemplateId: Types.ObjectId;
  isArchived: boolean;
  type: string;
  description?: string;
  startDate?: Date; //
  dueDate?: Date; //
  supervisors: Types.ObjectId[];
  completedDate?: Date;
  summary?: string;
  createdBy: Types.ObjectId; // Хэн үүсгэсэн
  archivedBy: Types.ObjectId; // Хэн үүсгэсэн
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    formTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
    },
    isArchived: { type: Boolean, default: false },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    supervisors: { type: [Schema.Types.ObjectId], ref: "User" },
    startDate: { type: Date, required: true },
    dueDate: Date,
    summary: String,
    completedDate: Date,
    archivedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Хэн үүсгэсэн
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

TaskSchema.index({ title: "text" });

// Index
TaskSchema.index({
  assignee: 1,
  status: 1,
  dueDate: 1,
});

TaskSchema.index({
  assignee: 1,
  status: 1,
  startDate: 1,
});

TaskSchema.index({
  branch: 1,
  formTemplateId: 1,
  status: 1,
  startDate: -1,
});

TaskSchema.index({
  branch: 1,
  formTemplateId: 1,
  status: 1,
  dueDate: -1,
});

TaskSchema.virtual("files", {
  ref: "File",
  localField: "_id",
  foreignField: "task",
});

TaskSchema.virtual("evaluations", {
  ref: "Evaluation",
  localField: "_id",
  foreignField: "task",
});

// virtual-уудыг JSON-д оруулах тохиргоо
TaskSchema.set("toObject", { virtuals: true });
TaskSchema.set("toJSON", { virtuals: true });
export const TaskModel = model<ITask>("Task", TaskSchema);

export interface ITaskFormData extends Document {
  taskId: Types.ObjectId;
  formTemplateId: Types.ObjectId;
  fields: IFieldEntry[];
}

const TaskFormDataSchema = new Schema<ITaskFormData>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    formTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },
    fields: [{ key: String, value: Schema.Types.Mixed }],
  },
  { timestamps: true }
);

TaskFormDataSchema.index({ "fields.key": 1, "fields.value": 1 });
TaskFormDataSchema.index({ taskId: 1 });

export const TaskFormDataModel = model<ITaskFormData>(
  "TaskFormData",
  TaskFormDataSchema
);
