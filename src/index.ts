import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

import { connectDB } from './config/mongodb';
import errorHandler from './middleware/error.middleware';
import { authRouter } from './modules/auth/auth.route';
import { userRouter } from './modules/user/user.route';
import { branchRouter } from './modules/branch/branch.route';
import { taskRouter } from './modules/task/task.route';
import { dashboardRouter } from './modules/dashboard/dashboard.route';
import { initSocket, io, onlineUsers } from './config/socket';
import { authenticate } from './middleware/auth.middleware';
import { notificationRouter } from './modules/notification/notification.route';
import { NotificationService } from './modules/notification/notification.service';

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get('/', async (_req, res) => {
  res.send('Hello world!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/branch', branchRouter);
app.use('/api/task', taskRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notification', authenticate, notificationRouter);

// Global error handler
app.use(errorHandler);

const server = http.createServer(app);

// socket server register
initSocket(server);

const notificationService = new NotificationService();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('register', async (userId: string) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);

    const list = await notificationService.getNotifications(userId);
    const unseenCount = await notificationService.getUnseenCount(userId);
    socket.emit('notifications', list);
    socket.emit('unseenCount', unseenCount);
  });

  socket.on('disconnect', () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});

async function startServer() {
  await connectDB();

  const PORT = process.env.PORT!;
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('🔥 Failed to start server', err);
});
