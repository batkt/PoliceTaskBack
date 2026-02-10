import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";
import cron from "node-cron";

dotenv.config();

import { connectDB } from "./config/mongodb";
import errorHandler from "./middleware/error.middleware";
import { authRouter } from "./modules/auth/auth.route";
import { userRouter } from "./modules/user/user.route";
import { branchRouter } from "./modules/branch/branch.route";
import { taskRouter } from "./modules/task/task.route";
import { dashboardRouter } from "./modules/dashboard/dashboard.route";
import { initSocket } from "./config/socket";
import { authenticate } from "./middleware/auth.middleware";
import { notificationRouter } from "./modules/notification/notification.route";
import { fileRouter } from "./modules/file/file.route";
import { taskV2Router } from "./modules/task-v2/task.route";
import { FileService } from "./modules/file/file.service";
import { getRedisClient } from "./config/redis";
import { clearStaleSocketsOnStartup } from "./utils/redis.util";
import { formRouter } from "./modules/form/form.route";
import { noteRouter } from "./modules/note/note.route";
import { auditRouter } from "./modules/audit/audit.route";
import { activityRouter } from "./modules/activity/activity.route";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
// console.log('---------------', path.join(__dirname, '../uploads'));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// app.set('trust proxy', true);

app.get("/", async (_req, res) => {
  res.send("Hello world!");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/branch", branchRouter);
app.use("/api/task", taskRouter);
app.use("/api/task-v2", authenticate, taskV2Router);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/notification", authenticate, notificationRouter);
app.use("/api/file", authenticate, fileRouter);
app.use("/api/form", authenticate, formRouter);
app.use("/api/note", authenticate, noteRouter);
app.use("/api/audit", authenticate, auditRouter);
app.use("/api/actvivity", authenticate, activityRouter);

// Global error handler
app.use(errorHandler);

const server = http.createServer(app);

const fileService = new FileService();

cron.schedule("30 6 * * *", async () => {
  try {
    await fileService.cleanupUnusedFiles();
  } catch (err) {
    console.error("❌ Failed to clear unused files[cron]:", err);
  }
});

cron.schedule("0 4 * * 7", async () => {
  try {
    await clearStaleSocketsOnStartup();
  } catch (err) {
    console.error("❌ Failed to clear stale sockets [cron]:", err);
  }
});

async function startServer() {
  await connectDB();
  getRedisClient();
  await clearStaleSocketsOnStartup();
  // socket server register
  initSocket(server);

  const PORT = process.env.PORT!;
  server.listen(PORT, () => {
    console.log(
      `🚀 Server is running on http://localhost:${PORT}`,
      dateFormat()
    );
  });
}

startServer().catch((err) => {
  console.error("🔥 Failed to start server", err);
});

const dateFormat = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hoursString = hours.toString().padStart(2, "0");
  const minutesString = minutes.toString().padStart(2, "0");
  const secondsString = seconds.toString().padStart(2, "0");

  return [hoursString, minutesString, secondsString].join(":");
};
