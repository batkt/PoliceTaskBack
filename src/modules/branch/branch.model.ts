import { Schema, model, Document, Types } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  isParent?: boolean; // эцэг салбар эсэх
  parent?: Types.ObjectId | null;
  path: string;
  createdBy?: Types.ObjectId; // хэн үүсгэсэн
}

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    isParent: { type: Boolean, default: false }, // эцэг салбар эсэх
    path: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // хэн үүсгэсэн
  },
  { timestamps: true }
);

branchSchema.index({ path: 1 });

export const BranchModel = model<IBranch>('Branch', branchSchema);
