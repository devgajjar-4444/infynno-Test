const Task = require('../models/Task');
const User = require('../models/User');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

// Get task summary report
const getTaskSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'month' } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  // Get task counts by status
  const taskStatusCounts = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get top 3 users by number of tasks created
  const topTaskCreators = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter } },
    {
      $group: {
        _id: '$createdBy',
        taskCount: { $sum: 1 }
      }
    },
    { $sort: { taskCount: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        userName: '$user.name',
        userEmail: '$user.email',
        userRole: '$user.role',
        taskCount: 1
      }
    }
  ]);

  // Get average completion time for completed tasks
  const completionTimeStats = await Task.aggregate([
    { 
      $match: { 
        isDeleted: false, 
        status: 'completed',
        completedAt: { $exists: true },
        ...dateFilter
      } 
    },
    {
      $addFields: {
        completionTime: {
          $divide: [
            { $subtract: ['$completedAt', '$createdAt'] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgCompletionTime: { $avg: '$completionTime' },
        minCompletionTime: { $min: '$completionTime' },
        maxCompletionTime: { $max: '$completionTime' },
        totalCompleted: { $sum: 1 }
      }
    }
  ]);

  // Get tasks by priority
  const taskPriorityCounts = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter } },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get overdue tasks count
  const overdueTasksCount = await Task.countDocuments({
    isDeleted: false,
    status: { $ne: 'completed' },
    dueDate: { $lt: new Date() },
    ...dateFilter
  });

  // Get tasks by due date range
  const now = new Date();
  const tasksByDueDate = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter } },
    {
      $addFields: {
        dueDateCategory: {
          $switch: {
            branches: [
              { case: { $lt: ['$dueDate', now] }, then: 'overdue' },
              { case: { $lt: ['$dueDate', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)] }, then: 'due_this_week' },
              { case: { $lt: ['$dueDate', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)] }, then: 'due_this_month' },
              { case: { $lt: ['$dueDate', new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)] }, then: 'due_next_quarter' }
            ],
            default: 'due_later'
          }
        }
      }
    },
    {
      $group: {
        _id: '$dueDateCategory',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get tasks by assignee
  const tasksByAssignee = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter } },
    {
      $group: {
        _id: '$assignedTo',
        taskCount: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    { $sort: { taskCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        userName: '$user.name',
        userEmail: '$user.email',
        userRole: '$user.role',
        taskCount: 1,
        completedCount: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedCount', '$taskCount'] },
            100
          ]
        }
      }
    }
  ]);

  // Get monthly task creation trend
  const monthlyTrend = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ]);

  // Format monthly trend data
  const formattedMonthlyTrend = monthlyTrend.map(item => ({
    period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    count: item.count
  }));

  // Calculate summary statistics
  const totalTasks = taskStatusCounts.reduce((sum, item) => sum + item.count, 0);
  const completedTasks = taskStatusCounts.find(item => item._id === 'completed')?.count || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const reportData = {
    summary: {
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      overdueTasks: overdueTasksCount
    },
    taskStatusCounts,
    taskPriorityCounts,
    topTaskCreators,
    completionTimeStats: completionTimeStats[0] || {
      avgCompletionTime: 0,
      minCompletionTime: 0,
      maxCompletionTime: 0,
      totalCompleted: 0
    },
    tasksByDueDate,
    tasksByAssignee,
    monthlyTrend: formattedMonthlyTrend,
    reportPeriod: {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      groupBy
    },
    generatedAt: new Date()
  };

  logger.info('Task summary report generated', {
    userId: req.user.id,
    userRole: req.user.role,
    reportPeriod: reportData.reportPeriod
  });

  res.status(200).json({
    success: true,
    data: reportData,
    timestamp: new Date().toISOString()
  });
});

// Get user performance report
const getUserPerformance = asyncHandler(async (req, res) => {
  const { startDate, endDate, userId } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  // Build user filter
  const userFilter = {};
  if (userId) {
    userFilter.$or = [
      { createdBy: userId },
      { assignedTo: userId }
    ];
  }

  // Get user performance metrics
  const userPerformance = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter, ...userFilter } },
    {
      $facet: {
        createdTasks: [
          { $match: { createdBy: { $exists: true } } },
          {
            $group: {
              _id: '$createdBy',
              totalCreated: { $sum: 1 },
              completedCreated: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              }
            }
          }
        ],
        assignedTasks: [
          { $match: { assignedTo: { $exists: true } } },
          {
            $group: {
              _id: '$assignedTo',
              totalAssigned: { $sum: 1 },
              completedAssigned: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              },
              overdueAssigned: {
                $sum: {
                  $cond: [
                    { 
                      $and: [
                        { $ne: ['$status', 'completed'] },
                        { $lt: ['$dueDate', new Date()] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]
      }
    },
    {
      $project: {
        allUsers: {
          $setUnion: [
            '$createdTasks._id',
            '$assignedTasks._id'
          ]
        },
        createdTasks: 1,
        assignedTasks: 1
      }
    },
    {
      $unwind: '$allUsers'
    },
    {
      $lookup: {
        from: 'users',
        localField: 'allUsers',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'tasks',
        let: { userId: '$allUsers' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$userId'] },
              isDeleted: false,
              ...dateFilter
            }
          },
          {
            $group: {
              _id: null,
              avgCompletionTime: {
                $avg: {
                  $cond: [
                    { $eq: ['$status', 'completed'] },
                    { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] },
                    null
                  ]
                }
              }
            }
          }
        ],
        as: 'completionTime'
      }
    },
    {
      $project: {
        userId: '$allUsers',
        userName: '$user.name',
        userEmail: '$user.email',
        userRole: '$user.role',
        totalCreated: {
          $ifNull: [
            { $arrayElemAt: ['$createdTasks.totalCreated', 0] },
            0
          ]
        },
        completedCreated: {
          $ifNull: [
            { $arrayElemAt: ['$createdTasks.completedCreated', 0] },
            0
          ]
        },
        totalAssigned: {
          $ifNull: [
            { $arrayElemAt: ['$assignedTasks.totalAssigned', 0] },
            0
          ]
        },
        completedAssigned: {
          $ifNull: [
            { $arrayElemAt: ['$assignedTasks.completedAssigned', 0] },
            0
          ]
        },
        overdueAssigned: {
          $ifNull: [
            { $arrayElemAt: ['$assignedTasks.overdueAssigned', 0] },
            0
          ]
        },
        avgCompletionTime: {
          $ifNull: [
            { $arrayElemAt: ['$completionTime.avgCompletionTime', 0] },
            0
          ]
        }
      }
    },
    {
      $addFields: {
        creationEfficiency: {
          $cond: [
            { $gt: ['$totalCreated', 0] },
            { $multiply: [{ $divide: ['$completedCreated', '$totalCreated'] }, 100] },
            0
          ]
        },
        assignmentEfficiency: {
          $cond: [
            { $gt: ['$totalAssigned', 0] },
            { $multiply: [{ $divide: ['$completedAssigned', '$totalAssigned'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { totalAssigned: -1 } }
  ]);

  logger.info('User performance report generated', {
    userId: req.user.id,
    userRole: req.user.role,
    reportPeriod: { startDate, endDate }
  });

  res.status(200).json({
    success: true,
    data: {
      userPerformance,
      reportPeriod: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      generatedAt: new Date()
    },
    timestamp: new Date().toISOString()
  });
});

// Get system health report
const getSystemHealth = asyncHandler(async (req, res) => {
  // Get total counts
  const [totalUsers, totalTasks, totalEmails] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Task.countDocuments({ isDeleted: false }),
    require('../models/Email').countDocuments()
  ]);

  // Get recent activity
  const recentTasks = await Task.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  const recentUsers = await User.find({ isActive: true })
    .sort({ lastLogin: -1 })
    .limit(5)
    .select('name email role lastLogin');

  // Get system statistics
  const systemStats = {
    totalUsers,
    totalTasks,
    totalEmails,
    activeUsers: await User.countDocuments({ 
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
    }),
    pendingTasks: await Task.countDocuments({ 
      isDeleted: false, 
      status: 'pending' 
    }),
    overdueTasks: await Task.countDocuments({ 
      isDeleted: false, 
      status: { $ne: 'completed' }, 
      dueDate: { $lt: new Date() } 
    })
  };

  logger.info('System health report generated', {
    userId: req.user.id,
    userRole: req.user.role
  });

  res.status(200).json({
    success: true,
    data: {
      systemStats,
      recentActivity: {
        recentTasks,
        recentUsers
      },
      generatedAt: new Date()
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  getTaskSummary,
  getUserPerformance,
  getSystemHealth
};
