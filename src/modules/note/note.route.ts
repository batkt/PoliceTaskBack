import { Router } from 'express';
import { NoteController } from './note.controller';

const router = Router();
const controller = new NoteController();

router.post('/remove', controller.removeNote.bind(controller));
router.get('/getTaskNotes/:taskId', controller.getTaskNotes.bind(controller));

export { router as noteRouter };
