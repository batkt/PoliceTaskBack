import { NextFunction, Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { NotificationPayload } from './notification.types';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  public createNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, type, title, message, taskId } =
        req.body as NotificationPayload;
      await this.notificationService.createNotification({
        userId,
        type,
        title,
        message,
        taskId,
      });
      res.send({ code: 200, data: true });
    } catch (error) {
      next(error);
    }
  };

  public createNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payloads = req.body as NotificationPayload[];
      await this.notificationService.createNotifications(payloads);
      res.send({ code: 200, data: true });
    } catch (error) {
      next(error);
    }
  };

  public broadcastNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { message, title } = req.body;
      await this.notificationService.broadcastSystemNotification(
        title,
        message
      );
      res.send({ code: 200, data: true });
    } catch (error) {
      next(error);
    }
  };

  public getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authUser = req.user!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filter = (req.query.filter as string) || 'all';

      const notifications = await this.notificationService.getNotifications(
        authUser.id,
        page,
        limit,
        filter as 'all' | 'unread'
      );
      res.status(200).json({
        code: 200,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  };

  public markAllAsSeen = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUser = req.user!;
      await this.notificationService.markAllAsSeen(authUser.id);
      res.json({ code: 200, data: true });
    } catch (error) {
      next(error);
    }
  };

  public markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { notificationId } = req.body;
      await this.notificationService.markAsRead(notificationId);
      res.json({ code: 200, data: true });
    } catch (error) {
      next(error);
    }
  };

  getUnseenCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.user!;
      const count = await this.notificationService.getUnseenCount(authUser.id);
      res.json({ code: 200, data: count });
    } catch (error) {
      next(error);
    }
  };
}
