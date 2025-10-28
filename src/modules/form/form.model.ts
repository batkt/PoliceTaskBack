import { Document, model, Schema } from 'mongoose';
import { FieldTypes } from './form.types';

export interface IFormField {
  name: string;
  label: string;
  type: FieldTypes;
  required: boolean;
  options?: string[];
  showInTable?: boolean;
}

const FormFieldSchema = new Schema<IFormField>(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: Object.values(FieldTypes), required: true },
    required: { type: Boolean, default: false },
    options: [String],
    showInTable: { type: Boolean, default: false },
  },
  { _id: false }
);

export interface IFormTemplate extends Document {
  name: string;
  description?: string;
  fields: IFormField[];
}

const FormTemplateSchema = new Schema<IFormTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String },
    fields: { type: [FormFieldSchema], default: [] },
  },
  { timestamps: true }
);

export const FormTemplateModel = model<IFormTemplate>(
  'FormTemplate',
  FormTemplateSchema
);
