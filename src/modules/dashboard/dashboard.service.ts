import { TaskModel } from '../task/task.model';

export class DashboardService {
  getTaskStatusCounts = async () => {
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
                endDate: { $lt: today },
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

    return { total, overdue, ...counts };
  };
}
