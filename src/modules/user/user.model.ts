import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  workerId: string;
  surname: string;
  givenname: string;
  branch?: Types.ObjectId; // Branch object or its ID
  rank: string;
  position: string;
  password: string;
  role: 'user' | 'super-admin' | 'admin';
  joiningDate?: Date; // Optional joining date
  // profile zurag talbar
  createdBy?: Types.ObjectId; // Хэн үүсгэсэн
}

const userSchema = new Schema<IUser>(
  {
    workerId: { type: String, required: true, unique: true },
    surname: { type: String, required: true },
    givenname: { type: String, required: true },
    position: { type: String, required: true },
    rank: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'admin', 'super-admin'],
      default: 'user',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Хэн үүсгэсэн
    joiningDate: { type: Date }, // Joining date with default value
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

export const UserModel = model<IUser>('User', userSchema);
