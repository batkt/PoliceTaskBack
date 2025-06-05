import { Router } from 'express';
import { TaskController } from './task.controller';

const router = Router();
const controller = new TaskController();

// Даалгавар үүсгэх
router.post('/', controller.createTask.bind(controller));

// Даалгаварт файл холбох
router.post('/file', controller.addFileToTask.bind(controller));

// Даалгавар эхлүүлэх (in_progress)
router.post('/start', controller.startTask.bind(controller));

// Даалгавар дуусгах
router.post('/complete', controller.completeTask.bind(controller));

// Даалгаварт тэмдэглэл нэмэх
router.post('/note', controller.addNote.bind(controller));

// Хяналт хийх (approved/rejected)
router.post('/audit', controller.auditTask.bind(controller));

// Үнэлгээ өгөх
router.post('/evaluate', controller.evaluateTask.bind(controller));

// Хэрэглэгчийн бүх даалгавар авах
router.get('/', controller.getTasks.bind(controller));

// Даалгаврын дэлгэрэнгүй
router.get('/:id', controller.getTaskDetail.bind(controller));

export { router as taskV2Router };
