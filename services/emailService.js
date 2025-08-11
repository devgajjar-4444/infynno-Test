const Email = require('../models/Email');
const User = require('../models/User');
const logger = require('../utils/logger');

// In-memory queue for email processing
const emailQueue = [];
let isProcessing = false;

// Email templates
const emailTemplates = {
  welcome: (user) => ({
    subject: `Welcome to Task Workflow, ${user.name}!`,
    content: `
      <h2>Welcome to Task Workflow!</h2>
      <p>Hi ${user.name},</p>
      <p>Welcome to our task management system. Your account has been successfully created.</p>
      <p><strong>Account Details:</strong></p>
      <ul>
        <li>Email: ${user.email}</li>
        <li>Role: ${user.role}</li>
        <li>Created: ${new Date(user.createdAt).toLocaleDateString()}</li>
      </ul>
      <p>You can now log in and start managing your tasks.</p>
      <p>Best regards,<br>Task Workflow Team</p>
    `
  }),

  taskAssignment: (task, assignee, assignedBy) => ({
    subject: `New Task Assigned: ${task.title}`,
    content: `
      <h2>New Task Assignment</h2>
      <p>Hi ${assignee.name},</p>
      <p>You have been assigned a new task by ${assignedBy.name}.</p>
      <p><strong>Task Details:</strong></p>
      <ul>
        <li>Title: ${task.title}</li>
        <li>Description: ${task.description}</li>
        <li>Priority: ${task.priority}</li>
        <li>Due Date: ${new Date(task.dueDate).toLocaleDateString()}</li>
        <li>Estimated Hours: ${task.estimatedHours || 'Not specified'}</li>
      </ul>
      <p>Please review the task and update its status accordingly.</p>
      <p>Best regards,<br>Task Workflow Team</p>
    `
  }),

  taskUpdate: (task, user, oldStatus, newStatus) => ({
    subject: `Task Status Updated: ${task.title}`,
    content: `
      <h2>Task Status Update</h2>
      <p>Hi ${user.name},</p>
      <p>The status of your task has been updated.</p>
      <p><strong>Task Details:</strong></p>
      <ul>
        <li>Title: ${task.title}</li>
        <li>Old Status: ${oldStatus}</li>
        <li>New Status: ${newStatus}</li>
        <li>Updated: ${new Date().toLocaleDateString()}</li>
      </ul>
      <p>Keep up the good work!</p>
      <p>Best regards,<br>Task Workflow Team</p>
    `
  }),

  taskReminder: (task, user) => ({
    subject: `Task Reminder: ${task.title}`,
    content: `
      <h2>Task Reminder</h2>
      <p>Hi ${user.name},</p>
      <p>This is a friendly reminder about your upcoming task.</p>
      <p><strong>Task Details:</strong></p>
      <ul>
        <li>Title: ${task.title}</li>
        <li>Description: ${task.description}</li>
        <li>Priority: ${task.priority}</li>
        <li>Due Date: ${new Date(task.dueDate).toLocaleDateString()}</li>
        <li>Current Status: ${task.status}</li>
      </ul>
      <p>Please ensure the task is completed on time.</p>
      <p>Best regards,<br>Task Workflow Team</p>
    `
  }),

  taskCompleted: (task, user) => ({
    subject: `Task Completed: ${task.title}`,
    content: `
      <h2>Task Completed!</h2>
      <p>Hi ${user.name},</p>
      <p>Congratulations! You have successfully completed a task.</p>
      <p><strong>Task Details:</strong></p>
      <ul>
        <li>Title: ${task.title}</li>
        <li>Description: ${task.description}</li>
        <li>Completed: ${new Date().toLocaleDateString()}</li>
        <li>Completion Time: ${task.completionTime ? Math.round(task.completionTime / (1000 * 60 * 60 * 24)) + ' days' : 'Not available'}</li>
      </ul>
      <p>Great job! Keep up the excellent work.</p>
      <p>Best regards,<br>Task Workflow Team</p>
    `
  })
};

// Add email to queue
const addToQueue = (emailData) => {
  emailQueue.push({
    ...emailData,
    id: Date.now() + Math.random(),
    addedAt: new Date(),
    attempts: 0,
    maxAttempts: 3
  });

  logger.email('queued', null, emailData.to, true, {
    type: emailData.type,
    subject: emailData.subject
  });

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
};

// Process email queue
const processQueue = async () => {
  if (isProcessing || emailQueue.length === 0) {
    return;
  }

  isProcessing = true;
  logger.info('Starting email queue processing', { queueLength: emailQueue.length });

  while (emailQueue.length > 0) {
    const emailJob = emailQueue.shift();
    
    try {
      await processEmailJob(emailJob);
      
      // Add delay between emails (1-2 seconds as specified)
      const delay = Math.random() * 1000 + 1000; // 1-2 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      logger.error('Error processing email job', {
        emailId: emailJob.id,
        error: error.message
      });

      // Retry logic
      if (emailJob.attempts < emailJob.maxAttempts) {
        emailJob.attempts++;
        emailJob.addedAt = new Date();
        emailQueue.push(emailJob);
        
        logger.warn('Email job requeued for retry', {
          emailId: emailJob.id,
          attempts: emailJob.attempts,
          maxAttempts: emailJob.maxAttempts
        });
      } else {
        logger.error('Email job failed permanently', {
          emailId: emailJob.id,
          maxAttempts: emailJob.maxAttempts
        });
      }
    }
  }

  isProcessing = false;
  logger.info('Email queue processing completed');
};

// Process individual email job
const processEmailJob = async (emailJob) => {
  logger.info('Processing email job', {
    emailId: emailJob.id,
    type: emailJob.type,
    recipient: emailJob.to
  });

  // Simulate email processing
  await simulateEmailProcessing(emailJob);
  
  logger.info('Email job processed successfully', {
    emailId: emailJob.id,
    type: emailJob.type,
    recipient: emailJob.to
  });
};

// Simulate email processing with delay
const simulateEmailProcessing = async (emailJob) => {
  // Simulate network delay and processing time
  const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate success/failure (90% success rate)
      if (Math.random() < 0.9) {
        resolve();
      } else {
        reject(new Error('Simulated email processing failure'));
      }
    }, processingTime);
  });
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const template = emailTemplates.welcome(user);
  
  const emailData = {
    to: user.email,
    subject: template.subject,
    content: template.content,
    type: 'welcome',
    recipient: user.id,
    sender: user.id, // System sender
    priority: 'normal'
  };

  // Add to queue for background processing
  addToQueue(emailData);
  
  // Also save to database for tracking
  try {
    const email = new Email(emailData);
    await email.save();
    
    logger.email('welcome_queued', email.id, user.email, true, {
      userId: user.id,
      userName: user.name
    });
  } catch (error) {
    logger.error('Error saving welcome email to database', {
      userId: user.id,
      error: error.message
    });
  }
};

// Send task assignment email
const sendTaskAssignmentEmail = async (task, assignee, assignedBy) => {
  const template = emailTemplates.taskAssignment(task, assignee, assignedBy);
  
  const emailData = {
    to: assignee.email,
    subject: template.subject,
    content: template.content,
    type: 'task_assignment',
    recipient: assignee.id,
    sender: assignedBy.id,
    relatedTask: task.id,
    priority: task.priority === 'urgent' ? 'high' : 'normal'
  };

  addToQueue(emailData);
  
  try {
    const email = new Email(emailData);
    await email.save();
    
    logger.email('task_assignment_queued', email.id, assignee.email, true, {
      taskId: task.id,
      assigneeId: assignee.id,
      assignedById: assignedBy.id
    });
  } catch (error) {
    logger.error('Error saving task assignment email to database', {
      taskId: task.id,
      error: error.message
    });
  }
};

// Send task update email
const sendTaskUpdateEmail = async (task, user, oldStatus, newStatus) => {
  const template = emailTemplates.taskUpdate(task, user, oldStatus, newStatus);
  
  const emailData = {
    to: user.email,
    subject: template.subject,
    content: template.content,
    type: 'task_update',
    recipient: user.id,
    sender: user.id, // Self-update
    relatedTask: task.id,
    priority: 'low'
  };

  addToQueue(emailData);
  
  try {
    const email = new Email(emailData);
    await email.save();
    
    logger.email('task_update_queued', email.id, user.email, true, {
      taskId: task.id,
      userId: user.id,
      oldStatus,
      newStatus
    });
  } catch (error) {
    logger.error('Error saving task update email to database', {
      taskId: task.id,
      error: error.message
    });
  }
};

// Send task reminder email
const sendTaskReminderEmail = async (task, user) => {
  const template = emailTemplates.taskReminder(task, user);
  
  const emailData = {
    to: user.email,
    subject: template.subject,
    content: template.content,
    type: 'reminder',
    recipient: user.id,
    sender: user.id, // System reminder
    relatedTask: task.id,
    priority: 'normal'
  };

  addToQueue(emailData);
  
  try {
    const email = new Email(emailData);
    await email.save();
    
    logger.email('task_reminder_queued', email.id, user.email, true, {
      taskId: task.id,
      userId: user.id
    });
  } catch (error) {
    logger.error('Error saving task reminder email to database', {
      taskId: task.id,
      error: error.message
    });
  }
};

// Send task completion email
const sendTaskCompletionEmail = async (task, user) => {
  const template = emailTemplates.taskCompleted(task, user);
  
  const emailData = {
    to: user.email,
    subject: template.subject,
    content: template.content,
    type: 'notification',
    recipient: user.id,
    sender: user.id, // System notification
    relatedTask: task.id,
    priority: 'low'
  };

  addToQueue(emailData);
  
  try {
    const email = new Email(emailData);
    await email.save();
    
    logger.email('task_completion_queued', email.id, user.email, true, {
      taskId: task.id,
      userId: user.id
    });
  } catch (error) {
    logger.error('Error saving task completion email to database', {
      taskId: task.id,
      error: error.message
    });
  }
};

// Get queue status
const getQueueStatus = () => {
  return {
    queueLength: emailQueue.length,
    isProcessing,
    pendingEmails: emailQueue.length,
    processingStatus: isProcessing ? 'active' : 'idle'
  };
};

// Clear queue (admin function)
const clearQueue = () => {
  const clearedCount = emailQueue.length;
  emailQueue.length = 0;
  
  logger.info('Email queue cleared', { clearedCount });
  
  return {
    message: 'Email queue cleared successfully',
    clearedCount
  };
};

// Get failed emails from database
const getFailedEmails = async (limit = 10) => {
  try {
    const failedEmails = await Email.getFailedEmails(limit);
    return failedEmails;
  } catch (error) {
    logger.error('Error getting failed emails', { error: error.message });
    throw error;
  }
};

// Retry failed email
const retryFailedEmail = async (emailId) => {
  try {
    const email = await Email.findById(emailId);
    if (!email) {
      throw new Error('Email not found');
    }

    if (!email.canRetry()) {
      throw new Error('Email cannot be retried');
    }

    // Reset email status and add to queue
    await email.retry();
    
    const emailData = {
      to: email.to,
      subject: email.subject,
      content: email.content,
      type: email.type,
      recipient: email.recipient,
      sender: email.sender,
      relatedTask: email.relatedTask,
      priority: email.priority
    };

    addToQueue(emailData);
    
    logger.info('Failed email retried', { emailId, recipient: email.to });
    
    return email;
  } catch (error) {
    logger.error('Error retrying failed email', { emailId, error: error.message });
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendTaskAssignmentEmail,
  sendTaskUpdateEmail,
  sendTaskReminderEmail,
  sendTaskCompletionEmail,
  getQueueStatus,
  clearQueue,
  getFailedEmails,
  retryFailedEmail,
  processQueue,
  addToQueue
};
