import { Router } from 'express';
import { validateRequestBody } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { taskSchema } from './task.schema';
import { TaskController } from './task.controller';

const router = Router();
const taskController = new TaskController();

// Auth routes
router.post(
  '/createMemoTask',
  authenticate,
  validateRequestBody(taskSchema.createMemoTask),
  taskController.createMemoTask
);

router.post(
  '/createWorkGroupTask',
  authenticate,
  validateRequestBody(taskSchema.createWorkGroupTask),
  taskController.createWorkGroupTask
);

router.get('/list', authenticate, taskController.getList);

router.get('/all', authenticate, taskController.getAll);
export { router as taskRouter };
