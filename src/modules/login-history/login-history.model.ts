import { Schema, model, Document, Types } from 'mongoose';

export interface ILoginHistory extends Document {
  userId: Types.ObjectId;
  ipAddress: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  createdAt: Date;
  location?: string; // optional - Geo IP
  success: boolean;
  reason?: string;
}

const LoginHistorySchema = new Schema<ILoginHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ipAddress: { type: String, required: true },
  userAgent: String,
  browser: String,
  os: String,
  device: String,
  createdAt: { type: Date, default: Date.now },
  location: String,
  success: { type: Boolean, required: true },
  reason: String,
});

export const LoginHistory = model<ILoginHistory>(
  'LoginHistory',
  LoginHistorySchema
);
