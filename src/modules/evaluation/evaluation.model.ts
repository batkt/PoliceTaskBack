import mongoose, { Schema } from 'mongoose';

const EvaluationSchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    evaluator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    feedback: String,
  },
  { timestamps: true }
);

export const EvaluationModel = mongoose.model('Evaluation', EvaluationSchema);
