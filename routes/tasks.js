const express = require('express');
const router = express.Router();

const taskController = require('../controllers/taskController');
const { 
  verifyToken, 
  requireManager, 
  requireAdmin,
  requireEmployee
} = require('../middlewares/auth');
const { createAuthRateLimiter } = require('../middlewares/rateLimit');
const { sanitizeInput } = require('../middlewares/validation');
const { 
  uploadMultipleFiles, 
  validateTaskAttachments, 
  cleanupUploads 
} = require('../middlewares/upload');
const taskValidator = require('../validators/taskValidator');

// Rate limiter for authenticated routes
const authRateLimiter = createAuthRateLimiter();

// Apply rate limiting and input sanitization to all routes
router.use(authRateLimiter);
router.use(sanitizeInput());

// Get all tasks with filtering and pagination
router.get('/', verifyToken,requireManager, taskValidator.validateQuery, taskController.getTasks);

// Get task by ID
router.get('/:id', verifyToken,requireManager, taskValidator.validateTaskId, taskController.getTaskById);

// Create new task (with optional file uploads)
router.post('/', 
  verifyToken, 
  requireManager, 
  uploadMultipleFiles,
  validateTaskAttachments,
  cleanupUploads,
  taskValidator.validateCreate, 
  taskController.createTask
);

// Update task
router.put('/:id', verifyToken,requireManager, taskValidator.validateTaskId, taskValidator.validateUpdate, taskController.updateTask);

// Delete task (soft delete)
router.delete('/:id', verifyToken, requireManager, taskValidator.validateTaskId, taskController.deleteTask);

// Assign task to another user
router.post('/:id/assign', verifyToken, requireManager, taskValidator.validateTaskId, taskValidator.validateAssign, taskController.assignTask);

// Employee routes
router.get('/employee/my-tasks', verifyToken, requireEmployee, taskController.getMyTasks);

// Update task status (only for assigned employee)
router.put('/employee/:id/status', verifyToken, requireEmployee, taskValidator.validateTaskId, taskController.updateTaskStatus);

// Add comment to task
router.post('/:id/comments', verifyToken,requireManager, taskValidator.validateTaskId, taskValidator.validateComment, taskController.addComment);

// Upload attachments to task
router.post('/:id/attachments', 
  verifyToken, 
  taskValidator.validateTaskId,
  uploadMultipleFiles,
  validateTaskAttachments,
  cleanupUploads,
  taskController.uploadAttachments
);

// Remove attachment from task
router.delete('/:id/attachments/:attachmentId', verifyToken,requireManager, taskValidator.validateTaskId, taskValidator.validateAttachmentId, taskController.removeAttachment);

// Admin: Restore deleted task
router.post('/:id/restore', verifyToken, requireAdmin, taskValidator.validateTaskId, taskController.restoreTask);

module.exports = router;
