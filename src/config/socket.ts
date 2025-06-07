import { Server } from 'socket.io';
import { NotificationService } from '../modules/notification/notification.service';
import {
  addOnlineUser,
  DASHBOARD_VIEWERS_KEY,
  removeOnlineUser,
} from '../utils/redis.util';
import { socketAuthenticate } from '../middleware/auth.middleware';
import { SocketService } from '../modules/socket/socket.service';
import { getRedisClient } from './redis';

export let io: Server;

export function initSocket(server: any): void {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  console.log(
    `✅ Socket ready: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`
  );

  io.use(socketAuthenticate);

  io.on('connection', async (socket) => {
    const socketId = socket.id;
    const userId = socket.data.userId;
    const redis = getRedisClient();

    await addOnlineUser(userId, socketId);
    console.log(`✅ Socket connected: ${userId} (${socketId})`);

    socket.on('dashboard:subscribe', async () => {
      const userId = socket.data.userId;
      await redis.sadd(DASHBOARD_VIEWERS_KEY, userId);
    });

    socket.on('dashboard:subscribe', async () => {
      const userId = socket.data.userId;
      await redis.sadd(DASHBOARD_VIEWERS_KEY, userId);
    });

    socket.on('dashboard:unsubscribe', async () => {
      const userId = socket.data.userId;
      await redis.srem(DASHBOARD_VIEWERS_KEY, userId);
    });

    socket.on('disconnect', async () => {
      await removeOnlineUser(userId, socketId);
      console.log(`❌ ${userId} disconnected (${socketId})`);
      await redis.srem(DASHBOARD_VIEWERS_KEY, userId);
    });

    const notificationService = new NotificationService();
    const socketService = new SocketService();
    const [notifications, notSeenCount] = await Promise.all([
      notificationService.getNotifications(userId),
      notificationService.getUnseenCount(userId),
    ]);

    socket.emit('notifications', notifications);
    socket.emit('notSeenCount', notSeenCount);
    await socketService.broadcastDashboardStats();
  });
}
