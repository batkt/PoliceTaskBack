import { Router } from 'express';
import { validateRequestBody } from '../../middleware/validate.middleware';
import { branchSchema } from './branch.schema';
import { BranchController } from './branch.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const branchController = new BranchController();

// Auth routes
router.post(
  '/create',
  authenticate,
  validateRequestBody(branchSchema.create),
  branchController.createBranch
);

export { router as branchRouter };
