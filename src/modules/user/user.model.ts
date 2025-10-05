import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  workerId: string;
  surname: string;
  givenname: string;
  branch: Types.ObjectId; // Branch object or its ID
  rank: string;
  position: string;
  password: string;
  role: "user" | "super-admin" | "admin";
  joinedDate?: Date; //
  isArchived: boolean;
  // profile zurag talbar
  profileImageUrl?: string;
  profileImage?: Types.ObjectId;
  createdBy?: Types.ObjectId; // Хэн үүсгэсэн
  archivedBy?: Types.ObjectId; // Хэн үүсгэсэн
  deleted?: boolean;
}

const userSchema = new Schema<IUser>(
  {
    workerId: { type: String, required: true },
    surname: { type: String, required: true },
    givenname: { type: String, required: true },
    position: { type: String, required: true },
    rank: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String },
    profileImage: { type: Schema.Types.ObjectId, ref: "File" },
    isArchived: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["user", "admin", "super-admin"],
      default: "user",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }, // Хэн үүсгэсэн
    archivedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Хэн үүсгэсэн
    joinedDate: { type: Date },
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true, // createdAt, updatedAt auto
  }
);

userSchema.index(
  { workerId: 1 },
  { unique: true, partialFilterExpression: { deleted: false } }
);

userSchema.index({ branch: 1, joinedDate: -1 });

userSchema.index({
  surname: "text",
  givenname: "text",
  rank: "text",
  position: "text",
  workerId: "text",
});

export const UserModel = model<IUser>("User", userSchema);
