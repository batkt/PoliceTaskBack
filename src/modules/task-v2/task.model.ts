import mongoose, { Document, Schema, Types } from 'mongoose';
import { TaskStatus, TaskPriority } from './task.types';

export interface ITask extends Document {
  assignees: Types.ObjectId[];
  title: string;
  description?: string;
  startDate?: Date; //
  dueDate?: Date; //
  completedDate?: Date;
  status: TaskStatus;
  priority: TaskPriority;
  // profile zurag talbar
  createdBy?: Types.ObjectId; // Хэн үүсгэсэн
}

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: 'medium',
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: 'pending',
    },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    startDate: { type: Date, required: true },
    dueDate: Date,
    completedDate: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

TaskSchema.virtual('files', {
  ref: 'File',
  localField: '_id',
  foreignField: 'task',
});

TaskSchema.virtual('evaluations', {
  ref: 'Evaluation',
  localField: '_id',
  foreignField: 'task',
});

// virtual-уудыг JSON-д оруулах тохиргоо
TaskSchema.set('toObject', { virtuals: true });
TaskSchema.set('toJSON', { virtuals: true });
export const TaskModel = mongoose.model<ITask>('Task', TaskSchema);
