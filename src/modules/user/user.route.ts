import { Router } from 'express';
import {
  validateRequestBody,
  validateRequestQuery,
} from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { userSchema } from './user.schema';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

// Auth routes
router.post(
  '/register',
  authenticate,
  validateRequestBody(userSchema.register),
  userController.register
);

router.post(
  '/update',
  authenticate,
  userController.update
);

router.post(
  '/changeUserPassword',
  authenticate,
  userController.changeUserPassword
);

router.get(
  '/list',
  authenticate,
  validateRequestQuery(userSchema.list),
  userController.getList
);

router.get('/getByIds', authenticate, userController.getUsersByIds);

router.get('/profile', authenticate, userController.getProfile);

export { router as userRouter };
