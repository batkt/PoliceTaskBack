import { NextFunction, Request, Response } from 'express';
import { FormService } from './form.service';

export class FormController {
  private formService;
  constructor() {
    this.formService = new FormService();
  }
  createForm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.formService.createFormTemplate(req.body);
      res.status(201).json({
        code: 200,
        data: true,
      });
    } catch (err) {
      next(err);
    }
  };

  getForms = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const forms = await this.formService.getAllFormTemplates();
      res.json({
        code: 200,
        data: forms,
      });
    } catch (err) {
      next(err);
    }
  };

  getFormById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await this.formService.getFormTemplateById(req.params.id);
      res.json({
        code: 200,
        data: form,
      });
    } catch (err) {
      next(err);
    }
  };
}
