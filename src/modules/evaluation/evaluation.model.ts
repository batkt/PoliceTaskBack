import { Schema, model, Document, Types } from 'mongoose';

export interface IEvaluation extends Document {
  suggestion?: string; //
  rating?: number; //
  task?: Types.ObjectId;
  createdBy?: Types.ObjectId; // Хэн үүсгэсэн
}

const evaluationSchema = new Schema<IEvaluation>(
  {
    suggestion: { type: String },
    rating: { type: Number },
    task: { type: Schema.Types.ObjectId, ref: 'Task' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

export const EvaluationModel = model<IEvaluation>(
  'Evaluation',
  evaluationSchema
);
