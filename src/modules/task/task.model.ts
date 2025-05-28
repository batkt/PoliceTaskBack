import { Schema, model, Document, Types } from 'mongoose';

export interface ITask extends Document {
  assigner: Types.ObjectId;
  title: string;
  description?: string;
  startDate?: Date; //
  endDate?: Date; //
  completedDate?: Date;
  status: 'pending' | 'active' | 'processing' | 'completed';
  type: string;
  priority: 'medium' | 'low' | 'high' | 'very-high';
  // profile zurag talbar
  createdBy?: Types.ObjectId; // Хэн үүсгэсэн
}

const taskSchema = new Schema<ITask>(
  {
    assigner: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    type: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    completedDate: { type: Date },
    description: { type: String },
    priority: {
      type: String,
      enum: ['medium', 'low', 'high', 'very-high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'processing', 'completed'],
      default: 'pending',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Хэн үүсгэсэн
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

taskSchema.virtual('inspections', {
  ref: 'Inspection',
  localField: '_id',
  foreignField: 'task',
});

taskSchema.virtual('evaluations', {
  ref: 'Evaluation',
  localField: '_id',
  foreignField: 'task',
});

// virtual-уудыг JSON-д оруулах тохиргоо
taskSchema.set('toObject', { virtuals: true });
taskSchema.set('toJSON', { virtuals: true });

export const TaskModel = model<ITask>('Task', taskSchema);
