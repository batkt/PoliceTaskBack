import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkGroup extends Document {
  name: string;
  task: Types.ObjectId;
  leader: Types.ObjectId;
  members: Types.ObjectId[];
  marking?: string;
  markingVoiceUrl?: string;
  markingDate?: Date;
}

const WorkGroupSchema = new Schema({
  name: String,
  task: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    unique: true,
  },
  leader: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  marking: { type: String },
  markingVoiceUrl: { type: String },
  markingDate: { type: Date },
});

export const WorkGroupModel = model('WorkGroup', WorkGroupSchema);
