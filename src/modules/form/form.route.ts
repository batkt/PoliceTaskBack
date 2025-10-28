import { Router } from 'express';
import { FormController } from './form.controller';

const router = Router();
const controller = new FormController();

router.post('/', controller.createForm.bind(controller));
router.get('/', controller.getForms.bind(controller));
router.get('/:id', controller.getFormById.bind(controller));

export { router as formRouter };
