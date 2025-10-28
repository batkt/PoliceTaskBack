import { Schema, model, Types, Document } from 'mongoose';

export type TaskActivityType =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'status-changed'
  | 'commented'
  | 'file-attached'
  | 'file-deleted'
  | 'evaluated'
  | 'audited';

export interface ITaskActivity extends Document {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  type: TaskActivityType;
  message?: string; // Хүсвэл тайлбар оруулж болно
  createdAt: Date;
}

const TaskActivitySchema = new Schema<ITaskActivity>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    message: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const TaskActivityModel = model<ITaskActivity>(
  'TaskActivity',
  TaskActivitySchema
);
