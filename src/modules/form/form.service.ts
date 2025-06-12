import { AppError } from '../../middleware/error.middleware';
import { FormTemplateModel, IFormTemplate } from './form.model';

export class FormService {
  createFormTemplate = async (data: Partial<IFormTemplate>) => {
    const form = new FormTemplateModel(data);
    return await form.save();
  };

  getAllFormTemplates = async () => {
    return await FormTemplateModel.find().sort({ createdAt: -1 }).lean();
  };

  getFormTemplateById = async (id: string) => {
    const form = await FormTemplateModel.findById(id).lean();

    if (!form) {
      throw new AppError(404, 'Get Form', 'Форм олдсонгүй.');
    }
    return form;
  };
}
