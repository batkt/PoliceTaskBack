import { Router } from 'express';
import { NotificationController } from './notification.controller';

const router = Router();
const notificationController = new NotificationController();

router.post('/notify', notificationController.createNotification);
router.post('/notify/multiple', notificationController.createNotifications);
router.post('/notify/broadcast', notificationController.broadcastNotification);
router.post('/seen', notificationController.markAllAsSeen);
router.post('/read', notificationController.markAsRead);
router.get('/list', notificationController.getNotifications);
router.get('/unseenCount', notificationController.getUnseenCount);

export { router as notificationRouter };
