import { Router } from 'express';
import { AuditController } from './audit.controller';

const router = Router();
const controller = new AuditController();

router.get('/:id', controller.getById.bind(controller));
router.get('/task/:taskId', controller.getByTask.bind(controller));

export { router as auditRouter };
