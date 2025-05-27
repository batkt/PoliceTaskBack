import { Schema, model, Document, Types } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  isParent?: boolean; // эцэг салбар эсэх
  parent?: Types.ObjectId; // эцэг салбар
  createdBy?: Types.ObjectId; // хэн үүсгэсэн
}

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    isParent: { type: Boolean, default: false }, // эцэг салбар эсэх
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // хэн үүсгэсэн
  },
  { timestamps: true }
);

export const BranchModel = model<IBranch>('Branch', branchSchema);
