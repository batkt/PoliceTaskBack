import { Router } from 'express';
import { validateRequestBody } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { userSchema } from './user.schema';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

// Auth routes
router.get(
  '/register',
  authenticate,
  validateRequestBody(userSchema.register),
  userController.register
);

export { router as userRouter };
