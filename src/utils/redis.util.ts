import { getRedisClient } from '../config/redis';

const redis = getRedisClient();

const ONLINE_USERS_KEY = 'online_users';
export const DASHBOARD_VIEWERS_KEY = 'dashboard_viewers';
export const USER_SOCKET_PREFIX = 'user_sockets:';

export async function clearStaleSocketsOnStartup() {
  const keys = await redis.keys(`${USER_SOCKET_PREFIX}*`);
  for (const key of keys) {
    await redis.del(key);
  }

  await redis.del(ONLINE_USERS_KEY);
  await redis.del(DASHBOARD_VIEWERS_KEY);
  console.log('🧹 Redis cleaned');
}

export async function addOnlineUser(userId: string, socketId: string) {
  const userSocketKey = `${USER_SOCKET_PREFIX}:${userId}`;

  await redis.sadd(userSocketKey, socketId);

  const socketCount = await redis.scard(userSocketKey);
  if (socketCount === 1) {
    // Анхны socket холболт
    await redis.sadd(ONLINE_USERS_KEY, userId);
  }
}

export async function removeOnlineUser(userId: string, socketId: string) {
  const userSocketKey = `${USER_SOCKET_PREFIX}:${userId}`;

  await redis.srem(userSocketKey, socketId);

  const socketCount = await redis.scard(userSocketKey);
  if (socketCount === 0) {
    await redis.srem(ONLINE_USERS_KEY, userId);
    await redis.del(userSocketKey);
  }
}

export const getSocketIdByUserId = async (userId: string) => {
  const userSocketKey = `${USER_SOCKET_PREFIX}:${userId}`;
  return await redis.smembers(userSocketKey);
};

export async function getOnlineUserCount(): Promise<number> {
  return await redis.scard(ONLINE_USERS_KEY);
}

export const increaseCountNewTask = async (status: string) => {
  await redis.incr('stats:total_tasks'); // total + 1
  await redis.incr(`stats:tasks_${status}`); // +1
};

export const changeCountStatus = async (
  oldStatus: string,
  newStatus: string
) => {
  await redis.decr(`stats:tasks_${oldStatus}`); // -1
  await redis.incr(`stats:tasks_${newStatus}`); // +1
};

export const getStatCounts = async () => {
  const keys = [
    'stats:total_tasks',
    'stats:tasks_pending',
    'stats:tasks_active',
    'stats:tasks_in_progress',
    'stats:tasks_completed',
    'stats:tasks_reviewed',
    'stats:tasks_overdue',
  ];

  const [values, onlineUserCount] = await Promise.all([
    redis.mget(...keys),
    redis.scard(ONLINE_USERS_KEY), // Set доторх userId-уудын тоо
  ]);

  const [total, pending, active, in_progress, completed, reviewed, overdue] =
    values.map((v) => parseInt(v || '0', 10));

  return {
    total,
    pending,
    active,
    overdue,
    in_progress,
    completed,
    reviewed,
    onlineUsers: onlineUserCount,
  };
};

export const setStatsCount = async ({
  total,
  overdue,
  active,
  pending,
  in_progress,
  completed,
  reviewed,
}: Record<string, number>) => {
  await redis.mset({
    'stats:total_tasks': total.toString(),
    'stats:tasks_pending': pending.toString(),
    'stats:tasks_in_progress': in_progress.toString(),
    'stats:tasks_completed': completed.toString(),
    'stats:tasks_overdue': overdue.toString(),
    'stats:tasks_reviewed': reviewed.toString(),
    'stats:tasks_active': active.toString(),
  });

  await redis.setex('stats:initialized', 86400, 'true'); // 24 tsag huchintei
  console.log('✅ Initialized counts data');
};

export const isEmptyStatsCountState = async () => {
  const initialized = await redis.get('stats:initialized');
  if (initialized === 'true') {
    return false;
  }
  return true;
};
