const { asyncHandler } = require('../middlewares/errorHandler');
const { emailValidation } = require('../utils/validation');
const emailService = require('../services/emailService');
const Email = require('../models/Email');
const User = require('../models/User');
const Task = require('../models/Task');
const { getMessage } = require('../messages');
const { STATUS_CODES } = require('../constants');
const logger = require('../utils/logger');

// Get email queue status (admin only)
const getQueueStatus = asyncHandler(async (req, res) => {
  const status = emailService.getQueueStatus();
  
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: status,
    timestamp: new Date().toISOString()
  });
});

// Simulate email processing (admin only)
const simulateEmailProcessing = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = emailValidation.simulate.validate(req.body);
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

  const { batchSize = 10 } = req.body;
  
  // Get pending emails from database
  const pendingEmails = await Email.getPendingEmails(batchSize);
  
  if (pendingEmails.length === 0) {
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'No pending emails to process',
      data: { processedCount: 0 },
      timestamp: new Date().toISOString()
    });
  }

  let processedCount = 0;
  const results = [];

  for (const email of pendingEmails) {
    try {
      // Mark as processing
      await email.markAsProcessing();
      
      // Simulate processing delay (1-2 seconds as specified)
      const delay = Math.random() * 1000 + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Simulate success/failure (90% success rate)
      if (Math.random() < 0.9) {
        await email.markAsSent();
        results.push({
          emailId: email.id,
          status: 'sent',
          recipient: email.to
        });
      } else {
        await email.markAsFailed('Simulated processing failure');
        results.push({
          emailId: email.id,
          status: 'failed',
          recipient: email.to,
          error: 'Simulated processing failure'
        });
      }
      
      processedCount++;
    } catch (error) {
      // Mark as failed if there's an error
      try {
        await email.markAsFailed(error.message);
      } catch (markError) {
        logger.error('Error marking email as failed:', markError);
      }
      
      results.push({
        emailId: email.id,
        status: 'failed',
        recipient: email.to,
        error: error.message
      });
    }
  }

  res.status(STATUS_CODES.OK).json({
    success: true,
    message: `Email processing simulation completed`,
    data: {
      processedCount,
      results,
      batchSize
    },
    timestamp: new Date().toISOString()
  });
});

// Clear email queue (admin only)
const clearQueue = asyncHandler(async (req, res) => {
  const result = emailService.clearQueue();
  
  res.status(STATUS_CODES.OK).json({
    success: true,
    message: result.message,
    data: result,
    timestamp: new Date().toISOString()
  });
});

// Get failed emails (admin only)
const getFailedEmails = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  console.log(limit);
  const failedEmails = await emailService.getFailedEmails(parseInt(limit));
  
  res.status(STATUS_CODES.OK).json({
    success: true,
    data: {
      failedEmails,
      count: failedEmails.length
    },
    timestamp: new Date().toISOString()
  });
});

// Retry failed email (admin only)
const retryFailedEmail = asyncHandler(async (req, res) => {
  const { emailId } = req.params;
  
  // Validate ObjectId
  if (!emailId || !/^[0-9a-fA-F]{24}$/.test(emailId)) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: {
        message: getMessage('VALIDATION.INVALID_OBJECT_ID'),
        statusCode: STATUS_CODES.BAD_REQUEST
      },
      timestamp: new Date().toISOString()
    });
  }
  
  const email = await emailService.retryFailedEmail(emailId);
  
  res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Email retry initiated successfully',
    data: { email },
    timestamp: new Date().toISOString()
  });
});

// Manual email processing (admin only)
const processManualEmail = asyncHandler(async (req, res) => {
  const { emailType, recipientId, taskId, customMessage } = req.body;
  
  // Basic validation
  if (!emailType || !recipientId) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: {
        message: 'Email type and recipient ID are required',
        statusCode: STATUS_CODES.BAD_REQUEST
      },
      timestamp: new Date().toISOString()
    });
  }

  // Validate ObjectIds
  if (!/^[0-9a-fA-F]{24}$/.test(recipientId)) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: {
        message: getMessage('VALIDATION.INVALID_OBJECT_ID'),
        statusCode: STATUS_CODES.BAD_REQUEST
      },
      timestamp: new Date().toISOString()
    });
  }

  if (taskId && !/^[0-9a-fA-F]{24}$/.test(taskId)) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: {
        message: getMessage('VALIDATION.INVALID_OBJECT_ID'),
        statusCode: STATUS_CODES.BAD_REQUEST
      },
      timestamp: new Date().toISOString()
    });
  }

  // Get recipient user
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return res.status(STATUS_CODES.NOT_FOUND).json({
      success: false,
      error: {
        message: 'Recipient user not found',
        statusCode: STATUS_CODES.NOT_FOUND
      },
      timestamp: new Date().toISOString()
    });
  }

  let task = null;
  if (taskId) {
    task = await Task.findById(taskId);
    if (!task) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: {
          message: 'Task not found',
          statusCode: STATUS_CODES.NOT_FOUND
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send email based on type
  let emailSent = false;
  switch (emailType) {
    case 'welcome':
      await emailService.sendWelcomeEmail(recipient);
      emailSent = true;
      break;
    case 'task_assignment':
      if (!task) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: {
            message: 'Task is required for task assignment email',
            statusCode: STATUS_CODES.BAD_REQUEST
          },
          timestamp: new Date().toISOString()
        });
      }
      await emailService.sendTaskAssignmentEmail(task, recipient, req.user);
      emailSent = true;
      break;
    case 'task_update':
      if (!task) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: {
            message: 'Task is required for task update email',
            statusCode: STATUS_CODES.BAD_REQUEST
          },
          timestamp: new Date().toISOString()
        });
      }
      await emailService.sendTaskUpdateEmail(task, recipient, 'pending', 'in_progress');
      emailSent = true;
      break;
    case 'task_reminder':
      if (!task) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: {
            message: 'Task is required for task reminder email',
            statusCode: STATUS_CODES.BAD_REQUEST
          },
          timestamp: new Date().toISOString()
        });
      }
      await emailService.sendTaskReminderEmail(task, recipient);
      emailSent = true;
      break;
    case 'task_completion':
      if (!task) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: {
            message: 'Task is required for task completion email',
            statusCode: STATUS_CODES.BAD_REQUEST
          },
          timestamp: new Date().toISOString()
        });
      }
      await emailService.sendTaskCompletionEmail(task, recipient);
      emailSent = true;
      break;
    default:
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: {
          message: 'Invalid email type',
          statusCode: STATUS_CODES.BAD_REQUEST
        },
        timestamp: new Date().toISOString()
      });
  }

  if (emailSent) {
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: `${emailType} email sent successfully`,
      data: {
        emailType,
        recipient: recipient.email,
        taskId: task?.id || null
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = {
  getQueueStatus,
  simulateEmailProcessing,
  clearQueue,
  getFailedEmails,
  retryFailedEmail,
  processManualEmail
};
