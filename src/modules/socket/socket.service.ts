import { io, onlineUsers } from '../../config/socket';

export class SocketService {
  sendNotificationToUser = (userId: string, data: any): void => {
    const socketId = onlineUsers.get(userId);
    if (socketId && io) {
      io.to(socketId).emit('notification', data);
    }
  };

  sendNotificationToUsers = (userIds: string[], data: any): void => {
    userIds.forEach((userId) => this.sendNotificationToUser(userId, data));
  };

  broadcastNotification = (data: any): void => {
    io.emit('notification', data);
  };
}
