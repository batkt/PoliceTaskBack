import { NextFunction, Request, Response } from 'express';
import { AuditService } from './audit.service';
import { AdminActions } from '../../types/roles';
import { canAccess } from '../../middleware/permission.middleware';
import { AppError } from '../../middleware/error.middleware';

export class AuditController {
  private auditService;

  constructor() {
    this.auditService = new AuditService();
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audit = await this.auditService.getAuditById(req.params.id);
      if (!audit) return res.status(404).json({ message: 'Not found' });
      res.json({
        code: 200,
        data: audit,
      });
    } catch (err) {
      next(err);
    }
  };

  getByTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audits = await this.auditService.getAuditsByTask(req.params.taskId);
      res.json({
        code: 200,
        data: audits,
      });
    } catch (err) {
      next(err);
    }
  };
}
