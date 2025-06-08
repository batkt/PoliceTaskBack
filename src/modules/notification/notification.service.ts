import { INotification, NotificationModel } from './notification.model';
import { NotificationPayload } from './notification.types';
import { SocketService } from '../socket/socket.service';
import { FilterQuery } from 'mongoose';

export class NotificationService {
  private socketService: SocketService;

  constructor() {
    this.socketService = new SocketService();
  }
  async createNotification(payload: NotificationPayload): Promise<void> {
    const { userId, type, title, message, taskId } = payload;
    const notification = new NotificationModel({
      userId,
      type,
      title,
      message,
      taskId,
    });
    const newNotification = await notification.save();
    await this.socketService.sendNotificationToUser(
      userId,
      newNotification.toObject()
    );
  }

  async createNotifications(payloads: NotificationPayload[]): Promise<void> {
    const notifications = payloads.map((payload) => ({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      taskId: payload.taskId,
    }));
    await NotificationModel.insertMany(notifications);
    const userIds = payloads.map((p) => p.userId);
    await this.socketService.sendNotificationToUsers(userIds, notifications);
  }

  async broadcastSystemNotification(
    title: string,
    message?: string
  ): Promise<void> {
    this.socketService.broadcastNotification({
      type: 'system',
      title,
      message,
    });
  }

  async getNotifications(
    userId: string,
    page = 1,
    pageSize = 10,
    filter: 'all' | 'unread' = 'all'
  ) {
    const skip = (page - 1) * pageSize;
    const query: FilterQuery<INotification> = { userId };

    if (filter === 'unread') {
      query.read = false;
    }

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec();

    const total = await NotificationModel.countDocuments(query);
    return {
      currentPage: page,
      rows: notifications,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async markAllAsSeen(userId: string): Promise<void> {
    const res = await NotificationModel.updateMany(
      { userId, seen: false },
      { $set: { seen: true } }
    );
  }

  async markAsRead(notificationId: string): Promise<void> {
    await NotificationModel.findByIdAndUpdate(notificationId, {
      $set: { read: true },
    });
  }

  async getUnseenCount(userId: string) {
    const unseenCount = await NotificationModel.countDocuments({
      userId,
      seen: false,
    });

    return unseenCount;
  }
}
