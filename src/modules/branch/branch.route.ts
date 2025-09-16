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

router.post(
  '/update',
  authenticate,
  branchController.updateBranch
);

router.get('/', authenticate, branchController.getAll);
router.get('/getOwnBranches', authenticate, branchController.getChildren);
router.get('/delete/:id', authenticate, branchController.delete);

export { router as branchRouter };
