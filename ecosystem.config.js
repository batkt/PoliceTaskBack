module.exports = {
  apps: [
    {
      name: "task-backend",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 8085,
        MONGODB_URI:
          "mongodb://root:example@localhost:27017/taskdb?authSource=admin",
        ACCESS_TOKEN_SECRET: "your_access_token_secret_here",
        FRONTEND_URL: "http://localhost:3000",
        REDIS_URL: "redis://localhost:6379",
        ADMIN_WORKER_ID: "admin",
        ADMIN_PASSWORD: "123456",
        BASE_URL: "http://localhost:8085",
      },
    },
  ],
};
