const Task = require('../models/Task');
const User = require('../models/User');
const { asyncHandler } = require('../middlewares/errorHandler');
const { taskValidation } = require('../utils/validation');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { deleteFile } = require('../middlewares/upload');
const { getMessage } = require('../messages');
const { ROLES } = require('../constants');

// Create new task
const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, priority, dueDate, estimatedHours, tags } = req.body;
  
  // // Check if assigned user exists and is active
  // const assignedUser = await User.findById(assignedTo);
  // if (!assignedUser || !assignedUser.isActive) {
  //   return res.status(400).json({
  //     success: false,
  //     error: {
  //       message: getMessage('TASK.INVALID_ASSIGNEE'),
  //       statusCode: 400
  //     },
  //     timestamp: new Date().toISOString()
  //   });
  // }

  // Create task
  const task = new Task({
    title,
    description,
    // assignedTo,
    createdBy: req.user.id,
    priority,
    dueDate,
    estimatedHours,
    tags
  });

  // Handle file attachments if any
  if (req.files && req.files.length > 0) {
    task.attachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimeType: file.mimetype,
      size: file.size
    }));
  }

  await task.save();

  // Send task assignment email
  try {
    await emailService.sendTaskAssignmentEmail(task, assignedUser, req.user);
  } catch (error) {
    logger.error('Failed to send task assignment email', {
      taskId: task.id,
      error: error.message
    });
  }

  // Populate user details
  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');

  logger.task('created', task.id, req.user.id, {
    title: task.title,
    // assignedTo: task.assignedTo.id,
    priority: task.priority
  });

  res.status(201).json({
    success: true,
    message: getMessage('TASK.CREATED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});

// Get all tasks with filtering and pagination
const getTasks = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    priority, 
    assignedTo, 
    createdBy, 
    dueDateFrom, 
    dueDateTo, 
    search, 
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  // Build query based on user role
  let query = { isDeleted: false };
  
  if (req.user.role === 'employee') {
    query.assignedTo = req.user.id;
  } else if (req.user.role === 'manager') {
    query.$or = [
      { createdBy: req.user.id },
      { assignedTo: req.user.id }
    ];
  }
  // Admin can see all tasks

  // Apply filters
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;
  if (createdBy) query.createdBy = createdBy;
  
  if (dueDateFrom || dueDateTo) {
    query.dueDate = {};
    if (dueDateFrom) query.dueDate.$gte = new Date(dueDateFrom);
    if (dueDateTo) query.dueDate.$lte = new Date(dueDateTo);
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  
  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute queries
  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit);

  logger.task('retrieved', null, req.user.id, {
    count: tasks.length,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    filters: Object.keys(query).filter(key => key !== 'isDeleted')
  });

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Get task by ID
const getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('comments.user', 'name email');

  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: getMessage('TASK.NOT_FOUND'),
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  logger.task('retrieved', task.id, req.user.id);

  res.status(200).json({
    success: true,
    data: { task },
    timestamp: new Date().toISOString()
  });
});

// Update task
const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const task = await Task.findById(id);
  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: getMessage('TASK.NOT_FOUND'),
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check if user can update this task
  if (req.user.role === ROLES.EMPLOYEE && !task.assignedTo.equals(req.user.id)) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  // Store old status for email notification
  const oldStatus = task.status;

  // Update task
  Object.keys(updates).forEach(key => {
    if (key !== 'id' && key !== '_id' && key !== 'createdBy') {
      task[key] = updates[key];
    }
  });

  // Handle status change
  if (updates.status && updates.status !== oldStatus) {
    task.updateStatus(updates.status, req.user.id);
  }

  await task.save();

  // Send email notification for status change
  if (updates.status && updates.status !== oldStatus) {
    try {
      const assignedUser = await User.findById(task.assignedTo);
      await emailService.sendTaskUpdateEmail(task, assignedUser, oldStatus, updates.status);
    } catch (error) {
      logger.error('Failed to send task update email', {
        taskId: task.id,
        error: error.message
      });
    }
  }

  // Populate user details
  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');

  logger.task('updated', task.id, req.user.id, {
    updatedFields: Object.keys(updates),
    oldStatus,
    newStatus: updates.status
  });

  res.status(200).json({
    success: true,
    message: getMessage('TASK.UPDATED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});

// Delete task (soft delete)
const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Task not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check if user can delete this task
  if (req.user.role === ROLES.EMPLOYEE) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  // Soft delete
  await task.softDelete(req.user.id);

  logger.task('deleted', task.id, req.user.id);

  res.status(200).json({
    success: true,
    message: getMessage('TASK.DELETED'),
    timestamp: new Date().toISOString()
  });
});

// Assign task to another user
const assignTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignedTo } = req.body;

  const task = await Task.findById(id);
  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Task not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }
  // Check if user can assign this task
  if (req.user.role == ROLES.EMPLOYEE) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check if new assignee exists and is active
  const newAssignee = await User.findById(assignedTo);
  console.log("new assignee",newAssignee, newAssignee.role);
  if(newAssignee.role == ROLES.MANAGER || newAssignee.role == ROLES.ADMIN){
    return res.status(400).json({
      success: false,
      error: {
        message: 'New assignee can not be a manager or admin',
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }
  if (!newAssignee || !newAssignee.isActive) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'New assignee not found or inactive',
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }

  // Store old assignee for email notification
  const oldAssignee = await User.findById(task.assignedTo);

  // Assign task
  await task.assignTask(assignedTo, req.user.id);

  // Send task assignment email
  try {
    await emailService.sendTaskAssignmentEmail(task, newAssignee, req.user);
  } catch (error) {
    logger.error('Failed to send task assignment email', {
      taskId: task.id,
      error: error.message
    });
  }

  // Populate user details
  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');

  logger.task('reassigned', task.id, req.user.id, {
    oldAssignee: oldAssignee?.id,
    newAssignee: assignedTo
  });

  res.status(200).json({
    success: true,
    message: getMessage('TASK.ASSIGNED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});

// Get tasks assigned to logged-in employee (with pagination, sorting, search)
const getMyTasks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search = '' } = req.query;

  console.log("req.user",req.user);
  // Ensure employee only sees their own tasks
  if (req.user.role !== ROLES.EMPLOYEE) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  const query = {
    assignedTo: req.user.id,
    isDeleted: false
  };

  // Search in title or description
  if (search.trim()) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort(sortOptions)
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Task.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    },
    timestamp: new Date().toISOString()
  });
});


// Update task status (only for assigned employee)
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (req.user.role !== ROLES.EMPLOYEE) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  const task = await Task.findById(id);
  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Task not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Ensure employee can only update their own tasks
  if (task.assignedTo.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  // Update status using model method
  await task.updateStatus(status, req.user.id);

  res.status(200).json({
    success: true,
    message: getMessage('TASK.STATUS_UPDATED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});


// Add comment to task
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const task = await Task.findById(id);
  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Task not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check if user can comment on this task
  if (req.user.role === ROLES.EMPLOYEE && !task.assignedTo.equals(req.user.id)) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  // Add comment
  await task.addComment(req.user.id, content);

  // Populate user details
  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');
  await task.populate('comments.user', 'name email');

  logger.task('commented', task.id, req.user.id, {
    commentLength: content.length
  });

  res.status(200).json({
    success: true,
    message: getMessage('TASK.COMMENT_ADDED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});

// Upload attachments to task
const uploadAttachments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Task not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check if user can upload to this task
  if (req.user.role === ROLES.EMPLOYEE && !task.assignedTo.equals(req.user.id)) {
    return res.status(403).json({
      success: false,
      error: {
        message: getMessage('GENERAL.FORBIDDEN'),
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: getMessage('FILE.UPLOAD_FAILED'),
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check if adding these files would exceed the limit
  if (task.attachments.length + req.files.length > 3) {
    return res.status(400).json({
      success: false,
      error: {
        message: getMessage('TASK.MAX_ATTACHMENTS_REACHED'),
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }

  // Add attachments
  const newAttachments = req.files.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    mimeType: file.mimetype,
    size: file.size
  }));

  task.attachments.push(...newAttachments);
  await task.save();

  // Populate user details
  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');

  logger.task('attachments_uploaded', task.id, req.user.id, {
    fileCount: req.files.length,
    totalAttachments: task.attachments.length
  });

  res.status(200).json({
    success: true,
    message: getMessage('TASK.ATTACHMENT_UPLOADED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});

// Remove attachment from task
const removeAttachment = asyncHandler(async (req, res) => {
  const { id, attachmentId } = req.params;

  const task = await Task.findById(id);
  if (!task || task.isDeleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Task not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check if user can remove attachments from this task
  if (req.user.role === 'employee' && !task.assignedTo.equals(req.user.id)) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You can only remove attachments from tasks assigned to you.',
        statusCode: 403
      },
      timestamp: new Date().toISOString()
    });
  }

  // Find attachment
  const attachment = task.attachments.id(attachmentId);
  if (!attachment) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Attachment not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Delete file from filesystem
  deleteFile(attachment.path);

  // Remove attachment from task
  await task.removeAttachment(attachmentId);

  // Populate user details
  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');

  logger.task('attachment_removed', task.id, req.user.id, {
    attachmentName: attachment.originalName
  });

  res.status(200).json({
    success: true,
    message: getMessage('TASK.ATTACHMENT_REMOVED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});

// Restore deleted task (admin only)
const restoreTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({
      success: false,
      error: {
        message: getMessage('TASK.NOT_FOUND'),
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  if (!task.isDeleted) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Task is not deleted',
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }

  // Restore task
  await task.restore();

  // Populate user details
  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');

  logger.task('restored', task.id, req.user.id);

  res.status(200).json({
    success: true,
    message: getMessage('TASK.RESTORED'),
    data: { task },
    timestamp: new Date().toISOString()
  });
});



module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  addComment,
  uploadAttachments,
  removeAttachment,
  restoreTask,
  getMyTasks,
  updateTaskStatus
};
