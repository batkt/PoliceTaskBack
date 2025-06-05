import { Schema, model } from 'mongoose';

const FileSchema = new Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true }, // хадгалагдсан нэр
  url: { type: String, required: true },
  duration: { type: Number },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // optional
  task: { type: Schema.Types.ObjectId, ref: 'Task' },
});

export const FileModel = model('File', FileSchema);
