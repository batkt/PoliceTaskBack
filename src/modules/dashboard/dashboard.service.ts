import {
  getStatCounts,
  isEmptyStatsCountState,
  setStatsCount,
} from '../../utils/redis.util';
import { TaskModel } from '../task-v2/task.model';

export class DashboardService {
  getTaskStatusCounts = async () => {
    const isEmptyStats = await isEmptyStatsCountState();
    if (isEmptyStats) {
      const now = new Date();
      const today = new Date(now.toISOString().slice(0, 10));

      const result = await TaskModel.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ],
            overdueCount: [
              {
                $match: {
                  dueDate: { $lt: today },
                  status: { $ne: 'completed' },
                },
              },
              {
                $count: 'count',
              },
            ],
            totalCount: [
              {
                $count: 'count',
              },
            ],
          },
        },
      ]);

      const raw = result[0];
      const total = raw.totalCount[0]?.count || 0;
      const overdue = raw.overdueCount[0]?.count || 0;
      const counts = raw.statusCounts.reduce(
        (acc: Record<string, number>, curr: { _id: string; count: number }) => {
          acc[curr._id] = curr.count;
          return acc;
        },
        {} as Record<string, number>
      );

      const output = {
        total,
        overdue,
        active: counts?.active || 0,
        pending: counts?.pending || 0,
        in_progress: counts?.in_progress || 0,
        completed: counts?.completed || 0,
        reviewed: counts?.reviewed || 0,
      };

      await setStatsCount(output);
      return getStatCounts();
    }
    return getStatCounts();
  };
}
