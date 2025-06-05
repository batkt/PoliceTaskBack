import mongoose, { Schema } from 'mongoose';

const AuditSchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    checkedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comments: String,
    result: { type: String, enum: ['approved', 'rejected'], required: true },
  },
  { timestamps: true }
);

export const AuditModel = mongoose.model('Audit', AuditSchema);
