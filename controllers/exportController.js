const { asyncHandler } = require('../middlewares/errorHandler');
const { exportValidation } = require('../utils/validation');
const createObjectCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const Task = require('../models/Task');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getMessage } = require('../messages');
const { STATUS_CODES } = require('../constants');

// Export tasks as CSV or JSON
const exportTasks = asyncHandler(async (req, res) => {
  // Validate request query
  const { error } = exportValidation.tasks.validate(req.query);
  if (error) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: {
        message: getMessage('GENERAL.BAD_REQUEST'),
        details: error.details.map(detail => detail.message),
        statusCode: STATUS_CODES.BAD_REQUEST
      },
      timestamp: new Date().toISOString()
    });
  }

  // Validate date range
  const { dueDateFrom, dueDateTo } = req.query;
  if (dueDateFrom && dueDateTo) {
    const startDate = new Date(dueDateFrom);
    const endDate = new Date(dueDateTo);
    
    if (startDate > endDate) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: {
          message: 'Start date cannot be after end date',
          statusCode: STATUS_CODES.BAD_REQUEST
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  const { format = 'csv', filters = {} } = req.query;
  
  // Build query based on filters
  const query = { isDeleted: false };
  
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.createdBy) query.createdBy = filters.createdBy;
  
  if (filters.dueDateFrom || filters.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) query.dueDate.$gte = new Date(filters.dueDateFrom);
    if (filters.dueDateTo) query.dueDate.$lte = new Date(filters.dueDateTo);
  }

  // Get tasks with populated user details
  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  if (format === 'csv') {
    // Create CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tasks-export-${timestamp}.csv`;
    const filepath = path.join(__dirname, '../uploads/exports', filename);
    
    // Ensure exports directory exists
    const exportsDir = path.dirname(filepath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Configure CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'Task ID' },
        { id: 'title', title: 'Title' },
        { id: 'description', title: 'Description' },
        { id: 'status', title: 'Status' },
        { id: 'priority', title: 'Priority' },
        { id: 'assignedToName', title: 'Assigned To' },
        { id: 'assignedToEmail', title: 'Assignee Email' },
        { id: 'createdByName', title: 'Created By' },
        { id: 'createdByEmail', title: 'Creator Email' },
        { id: 'dueDate', title: 'Due Date' },
        { id: 'estimatedHours', title: 'Estimated Hours' },
        { id: 'actualHours', title: 'Actual Hours' },
        { id: 'completedAt', title: 'Completed At' },
        { id: 'tags', title: 'Tags' },
        { id: 'attachmentsCount', title: 'Attachments Count' },
        { id: 'commentsCount', title: 'Comments Count' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' }
      ]
    });

    // Prepare data for CSV
    const csvData = tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedToName: task.assignedTo?.name || 'N/A',
      assignedToEmail: task.assignedTo?.email || 'N/A',
      createdByName: task.createdBy?.name || 'N/A',
      createdByEmail: task.createdBy?.email || 'N/A',
      dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : 'N/A',
      estimatedHours: task.estimatedHours || 'N/A',
      actualHours: task.actualHours || 'N/A',
      completedAt: task.completedAt ? task.completedAt.toISOString().split('T')[0] : 'N/A',
      tags: task.tags ? task.tags.join(', ') : 'N/A',
      attachmentsCount: task.attachments ? task.attachments.length : 0,
      commentsCount: task.comments ? task.comments.length : 0,
      createdAt: task.createdAt.toISOString().split('T')[0],
      updatedAt: task.updatedAt.toISOString().split('T')[0]
    }));

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Log export
    logger.info('Tasks exported to CSV', {
      userId: req.user.id,
      filename,
      recordCount: csvData.length,
      filters
    });

    // Send file for download
    res.download(filepath, filename, (err) => {
      if (err) {
        logger.error('Error sending CSV file', { error: err.message });
      }
      
      // Clean up file after download
      setTimeout(() => {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            logger.info('CSV export file cleaned up', { filename });
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up CSV file', { error: cleanupError.message });
        }
      }, 5000); // Clean up after 5 seconds
    });
  } else {
    // Return JSON format
    res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
        exportFormat: format,
        filters,
        exportedAt: new Date()
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Export users as CSV or JSON
const exportUsers = asyncHandler(async (req, res) => {
  const { format = 'csv', role, isActive } = req.query;
  
  // Build query
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Get users
  const users = await User.find(query)
    .select('-password -refreshTokens')
    .sort({ createdAt: -1 });

  if (format === 'csv') {
    // Create CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `users-export-${timestamp}.csv`;
    const filepath = path.join(__dirname, '../uploads/exports', filename);
    
    // Ensure exports directory exists
    const exportsDir = path.dirname(filepath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Configure CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'id', title: 'User ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'role', title: 'Role' },
        { id: 'isActive', title: 'Active' },
        { id: 'lastLogin', title: 'Last Login' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' }
      ]
    });

    // Prepare data for CSV
    const csvData = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive ? 'Yes' : 'No',
      lastLogin: user.lastLogin ? user.lastLogin.toISOString().split('T')[0] : 'Never',
      createdAt: user.createdAt.toISOString().split('T')[0],
      updatedAt: user.updatedAt.toISOString().split('T')[0]
    }));

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Log export
    logger.info('Users exported to CSV', {
      userId: req.user.id,
      filename,
      recordCount: csvData.length,
      filters: { role, isActive }
    });

    // Send file for download
    res.download(filepath, filename, (err) => {
      if (err) {
        logger.error('Error sending CSV file', { error: err.message });
      }
      
      // Clean up file after download
      setTimeout(() => {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            logger.info('CSV export file cleaned up', { filename });
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up CSV file', { error: cleanupError.message });
        }
      }, 5000); // Clean up after 5 seconds
    });
  } else {
    // Return JSON format
    res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        users,
        count: users.length,
        exportFormat: format,
        filters: { role, isActive },
        exportedAt: new Date()
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Export task reports as CSV or JSON
const exportTaskReports = asyncHandler(async (req, res) => {
  // Validate date range
  const { startDate, endDate } = req.query;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: {
          message: 'Start date cannot be after end date',
          statusCode: STATUS_CODES.BAD_REQUEST
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  const { format = 'csv' } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  // Get task statistics
  const taskStats = await Task.aggregate([
    { $match: { isDeleted: false, ...dateFilter } },
    {
      $group: {
        _id: {
          status: '$status',
          priority: '$priority',
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' }
        },
        count: { $sum: 1 },
        avgEstimatedHours: { $avg: '$estimatedHours' },
        avgActualHours: { $avg: '$actualHours' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.status': 1 } }
  ]);

  if (format === 'csv') {
    // Create CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `task-reports-${timestamp}.csv`;
    const filepath = path.join(__dirname, '../uploads/exports', filename);
    
    // Ensure exports directory exists
    const exportsDir = path.dirname(filepath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Configure CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'period', title: 'Period' },
        { id: 'status', title: 'Status' },
        { id: 'priority', title: 'Priority' },
        { id: 'count', title: 'Task Count' },
        { id: 'avgEstimatedHours', title: 'Avg Estimated Hours' },
        { id: 'avgActualHours', title: 'Avg Actual Hours' }
      ]
    });

    // Prepare data for CSV
    const csvData = taskStats.map(stat => ({
      period: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
      status: stat._id.status,
      priority: stat._id.priority,
      count: stat.count,
      avgEstimatedHours: Math.round(stat.avgEstimatedHours * 100) / 100 || 'N/A',
      avgActualHours: Math.round(stat.avgActualHours * 100) / 100 || 'N/A'
    }));

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Log export
    logger.info('Task reports exported to CSV', {
      userId: req.user.id,
      filename,
      recordCount: csvData.length,
      dateRange: { startDate, endDate }
    });

    // Send file for download
    res.download(filepath, filename, (err) => {
      if (err) {
        logger.error('Error sending CSV file', { error: err.message });
      }
      
      // Clean up file after download
      setTimeout(() => {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            logger.info('CSV export file cleaned up', { filename });
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up CSV file', { error: cleanupError.message });
        }
      }, 5000); // Clean up after 5 seconds
    });
  } else {
    // Return JSON format
    res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        taskStats,
        count: taskStats.length,
        exportFormat: format,
        dateRange: { startDate, endDate },
        exportedAt: new Date()
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = {
  exportTasks,
  exportUsers,
  exportTaskReports
};
