import { getRedisClient } from '../../config/redis';
import { io } from '../../config/socket';
import { getSocketIdByUserId } from '../../utils/redis.util';
import { DashboardService } from '../dashboard/dashboard.service';

export class SocketService {
  private dashboardService;
  constructor() {
    this.dashboardService = new DashboardService();
  }
  sendNotificationToUser = async (userId: string, data: any) => {
    const socketIds = await getSocketIdByUserId(userId);
    if (socketIds?.length > 0 && io) {
      socketIds.map((socketId: string) => {
        io.to(socketId).emit('notification', data);
      });
    }
  };

  sendNotificationToUsers = (userIds: string[], data: any): void => {
    userIds.forEach((userId) => this.sendNotificationToUser(userId, data));
  };

  broadcastNotification = (data: any): void => {
    io.emit('notification', data);
  };

  broadcast = (key: string, data: any) => {
    io.emit(key, data);
  };

  broadcastDashboardStats = async () => {
    const redis = getRedisClient();
    const data = await this.dashboardService.getTaskStatusCounts();

    const viewerIds = await redis.smembers('dashboard_viewers');

    console.log('wtf ', viewerIds);
    for (const userId of viewerIds) {
      const socketIds = await getSocketIdByUserId(userId);
      socketIds.forEach((socketId) => {
        io.to(socketId).emit('dashboard:update', data);
      });
    }

    this.broadcast('stats', data);
  };
}
