import { Router } from 'express';
import { validateRequestBody } from '../../middleware/validate.middleware';
import { authSchema } from './auth.schema';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Auth routes
router.post(
  '/login',
  validateRequestBody(authSchema.login),
  authController.login
);

router.post(
  '/register-super-admin',
  validateRequestBody(authSchema.registerSuperAdmin),
  authController.registerSuperAdmin
);

router.get(
  '/login-history',
  authenticate,
  authController.getLoginHistoryByUser
);

router.post('/change-password', authenticate, authController.changePassword);

export { router as authRouter };
