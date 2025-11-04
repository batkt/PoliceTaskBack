import { Types } from 'mongoose';
import {
  getStatCounts,
  isEmptyStatsCountState,
  setStatsCount,
} from '../../utils/redis.util';
import { TaskModel } from '../task-v2/task.model';
import { fromZonedTime } from 'date-fns-tz';
import { AuditModel } from '../audit/audit.model';
import { AuthUserType } from '../user/user.types';
import { BranchModel } from '../branch/branch.model';

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
  branchId?: string;
  assigneeId?: string;
  status?: string;
}

export class DashboardService {
  getTaskStatusCounts = async () => {
    const isEmptyStats = await isEmptyStatsCountState();
    if (isEmptyStats) {
      const timeZone = 'Asia/Ulaanbaatar';
      const now = new Date();
      // Өнөөдрийн YYYY-MM-DD string-ийг тухайн бүсээр гаргана
      const localTodayString = now.toLocaleDateString('en-CA', { timeZone }); // '2025-06-08'

      // Тухайн бүсийн 00:00 цагийг UTC рүү хөрвүүлнэ
      const today = fromZonedTime(`${localTodayString}T00:00:00`, timeZone);

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

  private applyRoleFilter(matchStage: any, user: AuthUserType): any {
    const filtered = { ...matchStage };

    // User: only own tasks
    if (user.role === "user") {
      filtered.assignee = new Types.ObjectId(user.id);
    }

    // Admin: only department tasks
    if (user.role === "admin" && user.branchId) {
      filtered.branchId = new Types.ObjectId(user.branchId);
    }

    // Super-admin: no additional filtering (see all)

    return filtered;
  }

  /**
   * 1. SUMMARY CARDS - Top KPIs
   */
  async getSummaryCards(filters: DateRangeFilter, user: AuthUserType) {
    const { startDate, endDate, branchId, assigneeId } = filters;

    let matchStage: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      isArchived: false,
    };

    if (branchId) matchStage.branchId = new Types.ObjectId(branchId);
    if (assigneeId) matchStage.assignee = new Types.ObjectId(assigneeId);

    matchStage = this.applyRoleFilter(matchStage, user);

    const [summary] = await TaskModel.aggregate([
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: "count" }],
          completed: [
            { $match: { status: "completed" } },
            { $count: "count" },
          ],
          approved: [{ $match: { status: "approved" } }, { $count: "count" }],
          rejected: [{ $match: { status: "rejected" } }, { $count: "count" }],
          inProgress: [
            { $match: { status: "in_progress" } },
            { $count: "count" },
          ],
          dueToday: [
            {
              $match: {
                dueDate: {
                  $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  $lt: new Date(new Date().setHours(23, 59, 59, 999)),
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    const totalTasks = summary.total[0]?.count || 0;
    const completedTasks = summary.completed[0]?.count || 0;
    const approvedTasks = summary.approved[0]?.count || 0;
    const rejectedTasks = summary.rejected[0]?.count || 0;
    const inProgressTasks = summary.inProgress[0]?.count || 0;
    const dueToday = summary.dueToday[0]?.count || 0;

    return {
      totalTasks,
      completedTasks,
      approvedTasks,
      rejectedTasks,
      inProgressTasks,
      dueToday,
      completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
      approvalRate: totalTasks ? (approvedTasks / totalTasks) * 100 : 0,
    };
  }

  /**
   * 2. DEPARTMENT STATUS DISTRIBUTION (Clustered Column Chart)
   * Super-admin only
   */
  async getDepartmentStatusDistribution(
    filters: DateRangeFilter,
    user: AuthUserType
  ) {
    if (user.role !== "super-admin") {
      return [];
    }

    const { startDate, endDate } = filters;

    const distribution = await TaskModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isArchived: false,
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $unwind: "$branch" },
      {
        $group: {
          _id: {
            branchId: "$branchId",
            branchName: "$branch.name",
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.branchId",
          branchName: { $first: "$_id.branchName" },
          statusCounts: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          branchId: "$_id",
          branchName: 1,
          new: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$statusCounts",
                    as: "s",
                    cond: { $eq: ["$$s.status", "new"] },
                  },
                },
                as: "s",
                in: "$$s.count",
              },
            },
          },
          in_progress: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$statusCounts",
                    as: "s",
                    cond: { $eq: ["$$s.status", "in_progress"] },
                  },
                },
                as: "s",
                in: "$$s.count",
              },
            },
          },
          completed: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$statusCounts",
                    as: "s",
                    cond: { $eq: ["$$s.status", "completed"] },
                  },
                },
                as: "s",
                in: "$$s.count",
              },
            },
          },
          approved: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$statusCounts",
                    as: "s",
                    cond: { $eq: ["$$s.status", "approved"] },
                  },
                },
                as: "s",
                in: "$$s.count",
              },
            },
          },
          rejected: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$statusCounts",
                    as: "s",
                    cond: { $eq: ["$$s.status", "rejected"] },
                  },
                },
                as: "s",
                in: "$$s.count",
              },
            },
          },
          _id: 0,
        },
      },
      { $sort: { branchName: 1 } },
    ]);

    return distribution;
  }

  /**
   * 3. APPROVAL & REJECTION GAUGE (Admin and Super-admin)
   */
  async getApprovalRejectionGauge(
    filters: DateRangeFilter,
    user: AuthUserType
  ) {
    const { startDate, endDate, branchId } = filters;

    let taskMatch: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      isArchived: false,
    };

    if (branchId) taskMatch.branchId = new Types.ObjectId(branchId);

    taskMatch = this.applyRoleFilter(taskMatch, user);

    const results = await AuditModel.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "task",
          foreignField: "_id",
          as: "taskInfo",
        },
      },
      { $unwind: "$taskInfo" },
      {
        $match: {
          "taskInfo.createdAt": { $gte: startDate, $lte: endDate },
          "taskInfo.isArchived": false,
          ...(user.role === "admin" && user.branchId
            ? { "taskInfo.branchId": new Types.ObjectId(user.branchId) }
            : {}),
          ...(user.role === "user"
            ? { "taskInfo.assignee": new Types.ObjectId(user.id) }
            : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$result", "approved"] }, 1, 0],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$result", "rejected"] }, 1, 0],
            },
          },
          avgScore: { $avg: "$point" },
        },
      },
      {
        $project: {
          totalReviews: 1,
          approved: 1,
          rejected: 1,
          avgScore: 1,
          approvalRate: {
            $multiply: [{ $divide: ["$approved", "$totalReviews"] }, 100],
          },
          rejectionRate: {
            $multiply: [{ $divide: ["$rejected", "$totalReviews"] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    return results[0] || {
      totalReviews: 0,
      approved: 0,
      rejected: 0,
      avgScore: 0,
      approvalRate: 0,
      rejectionRate: 0,
    };
  }

  /**
   * 4. TOP & BOTTOM PERFORMERS
   */
  async getTopBottomPerformers(
    filters: DateRangeFilter,
    user: AuthUserType
  ) {
    const { startDate, endDate, branchId } = filters;

    let matchStage: any = {
      createdAt: { $gte: startDate, $lte: endDate },
      isArchived: false,
    };

    // Apply branch filter if provided
    if (branchId) {
      matchStage.branchId = new Types.ObjectId(branchId);
    } else {
      matchStage = this.applyRoleFilter(matchStage, user);
    }

    const performance = await TaskModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "assignee",
          foreignField: "_id",
          as: "assigneeInfo",
        },
      },
      { $unwind: "$assigneeInfo" },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branchInfo",
        },
      },
      { $unwind: "$branchInfo" },
      {
        $group: {
          _id: "$assignee",
          employeeName: {
            $first: {
              $concat: [
                "$assigneeInfo.surname",
                " ",
                "$assigneeInfo.givenname",
              ],
            },
          },
          position: { $first: "$assigneeInfo.position" },
          branchName: { $first: "$branchInfo.name" },
          branchId: { $first: "$branchId" },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "approved"]] }, 1, 0],
            },
          },
          approvedTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
            },
          },
          rejectedTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
            },
          },
          lateTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$completedDate", null] },
                    { $ne: ["$dueDate", null] },
                    { $gt: ["$completedDate", "$dueDate"] },
                    // Don't count as late if created after due date (backfilled)
                    { $lt: ["$createdAt", "$dueDate"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          employeeId: "$_id",
          employeeName: 1,
          position: 1,
          branchName: 1,
          branchId: 1,
          totalTasks: 1,
          completedTasks: 1,
          approvedTasks: 1,
          rejectedTasks: 1,
          lateTasks: 1,
          completionRate: {
            $cond: [
              { $gt: ["$totalTasks", 0] },
              {
                $multiply: [
                  { $divide: ["$completedTasks", "$totalTasks"] },
                  100,
                ],
              },
              0,
            ],
          },
          approvalRate: {
            $cond: [
              { $gt: ["$completedTasks", 0] },
              {
                $multiply: [
                  { $divide: ["$approvedTasks", "$completedTasks"] },
                  100,
                ],
              },
              0,
            ],
          },
          onTimeRate: {
            $cond: [
              { $gt: ["$totalTasks", 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$totalTasks", "$lateTasks"] },
                      "$totalTasks",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
          _id: 0,
        },
      },
      { $sort: { completionRate: -1, approvalRate: -1 } },
    ]);

    return {
      topPerformers: performance.slice(0, 5),
      bottomPerformers: performance.slice(-5).reverse(),
      allEmployees: performance,
    };
  }

  /**
   * 5. USER PERSONAL ANALYTICS
   */
  async getUserPersonalAnalytics(filters: DateRangeFilter, user: AuthUserType) {
    const { startDate, endDate } = filters;
    const now = new Date();

    // 1. Average completion time
    const avgCompletionTime = await TaskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(user.id),
          createdAt: { $gte: startDate, $lte: endDate },
          completedDate: { $exists: true },
          isArchived: false,
        },
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ["$completedDate", "$createdAt"] },
              86400000, // Convert to days
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgCompletionDays: { $avg: "$completionTime" },
          minCompletionDays: { $min: "$completionTime" },
          maxCompletionDays: { $max: "$completionTime" },
          totalCompleted: { $sum: 1 },
        },
      },
    ]);

    // 2. On-time performance
    const onTimePerformance = await TaskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(user.id),
          createdAt: { $gte: startDate, $lte: endDate },
          dueDate: { $exists: true },
          completedDate: { $exists: true },
          isArchived: false,
        },
      },
      {
        $project: {
          isOnTime: {
            $cond: [
              {
                $or: [
                  { $lte: ["$completedDate", "$dueDate"] },
                  // If created after due date, don't count as late (backfilled)
                  { $gte: ["$createdAt", "$dueDate"] },
                ],
              },
              1,
              0,
            ],
          },
          isLate: {
            $cond: [
              {
                $and: [
                  { $gt: ["$completedDate", "$dueDate"] },
                  { $lt: ["$createdAt", "$dueDate"] },
                ],
              },
              1,
              0,
            ],
          },
          delayDays: {
            $cond: [
              {
                $and: [
                  { $gt: ["$completedDate", "$dueDate"] },
                  { $lt: ["$createdAt", "$dueDate"] },
                ],
              },
              {
                $divide: [
                  { $subtract: ["$completedDate", "$dueDate"] },
                  86400000,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          onTimeTasks: { $sum: "$isOnTime" },
          lateTasks: { $sum: "$isLate" },
          avgDelayDays: { $avg: "$delayDays" },
          maxDelayDays: { $max: "$delayDays" },
        },
      },
      {
        $project: {
          totalTasks: 1,
          onTimeTasks: 1,
          lateTasks: 1,
          avgDelayDays: 1,
          maxDelayDays: 1,
          onTimeRate: {
            $multiply: [{ $divide: ["$onTimeTasks", "$totalTasks"] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // 3. Approval/Rejection rates
    const approvalStats = await AuditModel.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "task",
          foreignField: "_id",
          as: "taskInfo",
        },
      },
      { $unwind: "$taskInfo" },
      {
        $match: {
          "taskInfo.assignee": new Types.ObjectId(user.id),
          "taskInfo.createdAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$result", "approved"] }, 1, 0],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$result", "rejected"] }, 1, 0],
            },
          },
          avgScore: { $avg: "$point" },
        },
      },
      {
        $project: {
          totalReviews: 1,
          approved: 1,
          rejected: 1,
          avgScore: 1,
          approvalRate: {
            $multiply: [{ $divide: ["$approved", "$totalReviews"] }, 100],
          },
          rejectionRate: {
            $multiply: [{ $divide: ["$rejected", "$totalReviews"] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // 4. Tasks due today
    const dueToday = await TaskModel.find({
      assignee: new Types.ObjectId(user.id),
      dueDate: {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lt: new Date(now.setHours(23, 59, 59, 999)),
      },
      status: { $in: ["new", "in_progress"] },
      isArchived: false,
    })
      .populate("branchId", "name")
      .select("title dueDate priority status")
      .lean();

    // 5. Overdue tasks
    const overdueTasks = await TaskModel.find({
      assignee: new Types.ObjectId(user.id),
      dueDate: { $lt: now },
      status: { $in: ["new", "in_progress"] },
      isArchived: false,
    })
      .populate("branchId", "name")
      .select("title dueDate priority status")
      .sort({ dueDate: 1 })
      .lean();

    // 6. Tasks to review (if user is supervisor)
    const tasksToReview = await TaskModel.find({
      supervisors: new Types.ObjectId(user.id),
      status: "completed",
      isArchived: false,
    })
      .populate("assignee", "surname givenname")
      .populate("branchId", "name")
      .select("title completedDate assignee")
      .sort({ completedDate: 1 })
      .lean();

    // 7. Monthly trend
    const monthlyTrend = await TaskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(user.id),
          createdAt: { $gte: startDate, $lte: endDate },
          isArchived: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          tasksCreated: { $sum: 1 },
          tasksCompleted: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "approved"]] }, 1, 0],
            },
          },
          tasksApproved: {
            $sum: {
              $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          tasksCreated: 1,
          tasksCompleted: 1,
          tasksApproved: 1,
          _id: 0,
        },
      },
    ]);

    return {
      completionTime: avgCompletionTime[0] || {
        avgCompletionDays: 0,
        minCompletionDays: 0,
        maxCompletionDays: 0,
        totalCompleted: 0,
      },
      onTimePerformance: onTimePerformance[0] || {
        totalTasks: 0,
        onTimeTasks: 0,
        lateTasks: 0,
        avgDelayDays: 0,
        maxDelayDays: 0,
        onTimeRate: 0,
      },
      approvalStats: approvalStats[0] || {
        totalReviews: 0,
        approved: 0,
        rejected: 0,
        avgScore: 0,
        approvalRate: 0,
        rejectionRate: 0,
      },
      dueToday: dueToday.map((task: any) => ({
        taskId: task._id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        branch: task.branchId?.name || "N/A",
      })),
      overdueTasks: overdueTasks.map((task: any) => ({
        taskId: task._id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        branch: task.branchId?.name || "N/A",
        daysOverdue: Math.floor(
          (now.getTime() - new Date(task.dueDate).getTime()) / 86400000
        ),
      })),
      tasksToReview: tasksToReview.map((task: any) => ({
        taskId: task._id,
        title: task.title,
        completedDate: task.completedDate,
        assignee: `${task.assignee?.surname || ""} ${
          task.assignee?.givenname || ""
        }`.trim(),
        branch: task.branchId?.name || "N/A",
        waitingDays: Math.floor(
          (now.getTime() - new Date(task.completedDate).getTime()) / 86400000
        ),
      })),
      monthlyTrend,
    };
  }

  /**
   * Get list of branches for filter
   */
  async getBranchesList(user: AuthUserType) {
    if (user.role === "super-admin") {
      return await BranchModel.find().select("_id name").lean();
    }

    if (user.role === "admin" && user.branchId) {
      return await BranchModel.find({
        _id: new Types.ObjectId(user.branchId),
      })
        .select("_id name")
        .lean();
    }

    return [];
  }

  /**
   * MASTER DASHBOARD - Get all metrics based on role
   */
  async getMasterDashboard(filters: DateRangeFilter, user: AuthUserType) {
    const summary = await this.getSummaryCards(filters, user);

    // Super-admin dashboard
    if (user.role === "super-admin") {
      const [
        departmentStatusDistribution,
        approvalRejectionGauge,
        topBottomPerformers,
        branches,
      ] = await Promise.all([
        this.getDepartmentStatusDistribution(filters, user),
        this.getApprovalRejectionGauge(filters, user),
        this.getTopBottomPerformers(filters, user),
        this.getBranchesList(user),
      ]);

      return {
        summary,
        departmentStatusDistribution,
        approvalRejectionGauge,
        topPerformers: topBottomPerformers.topPerformers,
        bottomPerformers: topBottomPerformers.bottomPerformers,
        branches,
        generatedAt: new Date(),
      };
    }

    // Admin dashboard
    if (user.role === "admin") {
      const [
        approvalRejectionGauge,
        topBottomPerformers,
        personalAnalytics,
        branches,
      ] = await Promise.all([
        this.getApprovalRejectionGauge(filters, user),
        this.getTopBottomPerformers(filters, user),
        this.getUserPersonalAnalytics(filters, user),
        this.getBranchesList(user),
      ]);

      return {
        summary,
        approvalRejectionGauge,
        topPerformers: topBottomPerformers.topPerformers,
        bottomPerformers: topBottomPerformers.bottomPerformers,
        personalAnalytics,
        branches,
        generatedAt: new Date(),
      };
    }

    // User dashboard
    const personalAnalytics = await this.getUserPersonalAnalytics(
      filters,
      user
    );

    return {
      summary,
      personalAnalytics,
      generatedAt: new Date(),
    };
  }
}
