import mongoose, { Document, Schema, Types } from 'mongoose';
import { NotificationType } from './notification.types';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message?: string;
  taskId?: Types.ObjectId;
  read: boolean;
  seen: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    read: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

export const NotificationModel = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
