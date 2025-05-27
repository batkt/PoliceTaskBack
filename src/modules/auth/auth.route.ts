import { Router } from 'express';
import { validateRequestBody } from '../../middleware/validate.middleware';
import { authSchema } from './auth.schema';
import { AuthController } from './auth.controller';

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

export { router as authRouter };
