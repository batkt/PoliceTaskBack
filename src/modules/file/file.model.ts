import { Schema, Types, model } from 'mongoose';
import { FileUsageType } from './file.types';

export interface IFile {
  originalName: string;
  filename: string;
  url: string;
  duration?: number;
  mimetype: string;
  size: number;
  usageType?: FileUsageType;
  uploadedBy: Types.ObjectId;
  task: string;
  isActive: boolean;
}

const FileSchema = new Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true }, // хадгалагдсан нэр
  url: { type: String, required: true },
  duration: { type: Number },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  usageType: {
    type: Object.values(FileUsageType),
    default: FileUsageType.ATTACHMENT,
  },
  isActive: { type: Boolean, required: true, default: false },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // optional
  task: { type: Schema.Types.ObjectId, ref: 'Task' },
});

export const FileModel = model('File', FileSchema);
