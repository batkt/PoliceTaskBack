import { Schema, model, Document, Types } from 'mongoose';

export interface IInspection extends Document {
  suggestion?: string; //
  reason?: string; //
  status: 'approved' | 'returned';
  task?: Types.ObjectId;
  createdBy?: Types.ObjectId; // Хэн үүсгэсэн
}

const inspectionSchema = new Schema<IInspection>(
  {
    suggestion: { type: String },
    reason: { type: String },
    task: { type: Schema.Types.ObjectId, ref: 'Task' },
    status: {
      type: String,
      enum: ['approved', 'returned'],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

export const InspectionModel = model<IInspection>(
  'Inspection',
  inspectionSchema
);
