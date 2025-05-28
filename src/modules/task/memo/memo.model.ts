import { Schema, model, Document, Types } from 'mongoose';

export interface IMemo extends Document {
  task: Types.ObjectId;
  documentNumber?: string; //
  marking?: string; //
  markingVoiceUrl?: string;
  markingDate?: Date;
}

const memoSchema = new Schema<IMemo>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      unique: true,
    },
    documentNumber: { type: String },
    marking: { type: String },
    markingVoiceUrl: { type: String },
    markingDate: { type: Date },
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

export const MemoModel = model<IMemo>('Memo', memoSchema);
