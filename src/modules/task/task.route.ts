import { Router } from 'express';
import {
  validateRequestBody,
  validateRequestQuery,
} from '../../middleware/validate.middleware';
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

router.post(
  '/changeStatus',
  authenticate,
  validateRequestBody(taskSchema.changeStatus),
  taskController.changeStatus
);

router.get('/all', authenticate, taskController.getAll);

router.get(
  '/getMemoByTaskId',
  authenticate,
  validateRequestQuery(taskSchema.taskId),
  taskController.getMemoByTaskId
);
router.get(
  '/getWorkgroupByTaskId',
  authenticate,
  validateRequestQuery(taskSchema.taskId),
  taskController.getWorkgroupByTaskId
);

export { router as taskRouter };
