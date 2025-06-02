import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/mongodb';
import errorHandler from './middleware/error.middleware';
import { authRouter } from './modules/auth/auth.route';
import { userRouter } from './modules/user/user.route';
import { branchRouter } from './modules/branch/branch.route';
import { taskRouter } from './modules/task/task.route';
import { dashboardRouter } from './modules/dashboard/dashboard.route';

const app = express();

// Middleware
app.use(cors());
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

// Global error handler
app.use(errorHandler);

async function startServer() {
  await connectDB();

  const PORT = process.env.PORT!;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('🔥 Failed to start server', err);
});
