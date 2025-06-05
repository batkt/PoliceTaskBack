import mongoose, { Schema } from 'mongoose';

const NoteSchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const NoteModel = mongoose.model('Note', NoteSchema);
