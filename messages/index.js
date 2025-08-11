// Centralized message file for all success and error messages
// Default language: English

const MESSAGES = {
  // Authentication messages
  AUTH: {
    REGISTER_SUCCESS: 'User registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    TOKEN_REFRESH_SUCCESS: 'Token refreshed successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'Email already exists',
    USER_NOT_FOUND: 'User not found',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_REQUIRED: 'Access token is required',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
    ACCOUNT_DEACTIVATED: 'Account has been deactivated',
    REFRESH_TOKEN_EXPIRED: 'Refresh token has expired',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token'
  },

  // Task messages
  TASK: {
    CREATED: 'Task created successfully',
    UPDATED: 'Task updated successfully',
    DELETED: 'Task deleted successfully',
    RESTORED: 'Task restored successfully',
    ASSIGNED: 'Task assigned successfully',
    STATUS_UPDATED: 'Task status updated successfully',
    COMMENT_ADDED: 'Comment added successfully',
    ATTACHMENT_UPLOADED: 'Attachment uploaded successfully',
    ATTACHMENT_REMOVED: 'Attachment removed successfully',
    NOT_FOUND: 'Task not found',
    ALREADY_DELETED: 'Task is already deleted',
    INVALID_STATUS: 'Invalid task status',
    INVALID_PRIORITY: 'Invalid task priority',
    MAX_ATTACHMENTS_REACHED: 'Maximum number of attachments (3) reached',
    INVALID_FILE_TYPE: 'Invalid file type. Only PDF, JPG, and PNG are allowed',
    FILE_TOO_LARGE: 'File size exceeds maximum limit of 5MB',
    UPLOAD_FAILED: 'File upload failed',
    NO_ATTACHMENTS: 'No attachments found for this task',
    DUE_DATE_PAST: 'Due date cannot be in the past',
    INVALID_ASSIGNEE: 'Invalid assignee specified'
  },

  // User management messages
  USER: {
    ROLE_UPDATED: 'User role updated successfully',
    STATUS_TOGGLED: 'User status toggled successfully',
    LIST_RETRIEVED: 'Users retrieved successfully',
    PROFILE_RETRIEVED: 'Profile retrieved successfully',
    ROLE_CHANGE_FORBIDDEN: 'Cannot change role of admin users',
    SELF_ROLE_CHANGE: 'Cannot change your own role',
    SELF_DEACTIVATE: 'Cannot deactivate your own account',
    INVALID_ROLE: 'Invalid role specified',
    USER_DEACTIVATED: 'User has been deactivated',
    USER_ACTIVATED: 'User has been activated'
  },

  // Report messages
  REPORT: {
    TASK_SUMMARY_RETRIEVED: 'Task summary report retrieved successfully',
    USER_PERFORMANCE_RETRIEVED: 'User performance report retrieved successfully',
    SYSTEM_HEALTH_RETRIEVED: 'System health report retrieved successfully',
    NO_DATA_AVAILABLE: 'No data available for the specified criteria',
    INVALID_DATE_RANGE: 'Invalid date range specified',
    REPORT_GENERATION_FAILED: 'Failed to generate report'
  },

  // Email messages
  EMAIL: {
    QUEUE_STATUS_RETRIEVED: 'Email queue status retrieved successfully',
    PROCESSING_STARTED: 'Email processing started',
    PROCESSING_COMPLETED: 'Email processing completed',
    QUEUE_CLEARED: 'Email queue cleared successfully',
    FAILED_EMAILS_RETRIEVED: 'Failed emails retrieved successfully',
    RETRY_SUCCESSFUL: 'Email retry successful',
    RETRY_FAILED: 'Email retry failed',
    NO_PENDING_EMAILS: 'No pending emails in queue',
    EMAIL_SENT: 'Email sent successfully',
    EMAIL_FAILED: 'Email failed to send',
    INVALID_EMAIL_TYPE: 'Invalid email type specified',
    WELCOME_EMAIL_QUEUED: 'Welcome email queued successfully',
    TASK_ASSIGNMENT_EMAIL_QUEUED: 'Task assignment email queued successfully'
  },

  // Export messages
  EXPORT: {
    TASKS_EXPORTED: 'Tasks exported successfully',
    USERS_EXPORTED: 'Users exported successfully',
    REPORT_EXPORTED: 'Report exported successfully',
    EXPORT_FAILED: 'Export failed',
    NO_DATA_TO_EXPORT: 'No data available for export',
    INVALID_EXPORT_FORMAT: 'Invalid export format specified',
    FILE_CREATED: 'Export file created successfully',
    FILE_DOWNLOADED: 'File downloaded successfully'
  },

  // Validation messages
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please provide a valid email address',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
    PASSWORD_TOO_LONG: 'Password cannot exceed 128 characters',
    INVALID_PASSWORD: 'Password must be 8-128 chars, include upper, lower, number and special character',
    NAME_TOO_SHORT: 'Name must be at least 2 characters long',
    NAME_TOO_LONG: 'Name cannot exceed 50 characters',
    TITLE_TOO_SHORT: 'Title must be at least 3 characters long',
    TITLE_TOO_LONG: 'Title cannot exceed 100 characters',
    DESCRIPTION_TOO_LONG: 'Description cannot exceed 1000 characters',
    INVALID_OBJECT_ID: 'Invalid ID format',
    INVALID_DATE: 'Invalid date format',
    INVALID_PAGE_NUMBER: 'Page number must be a positive integer',
    INVALID_LIMIT: 'Limit must be between 1 and 100',
    INVALID_SORT_ORDER: 'Sort order must be either "asc" or "desc"',
    INVALID_SEARCH_TERM: 'Search term must be at least 2 characters long'
  },

  // Rate limiting messages
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: 'Too many requests, please try again later',
    UPLOAD_LIMIT_EXCEEDED: 'Upload limit exceeded, please try again later',
    AUTH_LIMIT_EXCEEDED: 'Authentication attempts exceeded, please try again later'
  },

  // General messages
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    ERROR: 'An error occurred',
    NOT_FOUND: 'Resource not found',
    FORBIDDEN: 'Access forbidden',
    UNAUTHORIZED: 'Unauthorized access',
    BAD_REQUEST: 'Bad request',
    INTERNAL_ERROR: 'Internal server error',
    VALIDATION_ERROR: 'Validation error',
    DATABASE_ERROR: 'Database operation failed',
    FILE_OPERATION_FAILED: 'File operation failed',
    SERVER_STARTED: 'Server started successfully',
    DATABASE_CONNECTED: 'Database connected successfully',
    DATABASE_DISCONNECTED: 'Database disconnected',
    HEALTH_CHECK: 'Server is healthy',
    ROUTE_NOT_FOUND: 'Route not found'
  },

  // File operation messages
  FILE: {
    UPLOAD_SUCCESS: 'File uploaded successfully',
    UPLOAD_FAILED: 'File upload failed',
    DELETE_SUCCESS: 'File deleted successfully',
    DELETE_FAILED: 'File deletion failed',
    FILE_NOT_FOUND: 'File not found',
    INVALID_FILE_PATH: 'Invalid file path',
    STORAGE_ERROR: 'File storage error',
    CLEANUP_SUCCESS: 'File cleanup completed',
    CLEANUP_FAILED: 'File cleanup failed'
  },

  // Database messages
  DATABASE: {
    CONNECTION_SUCCESS: 'Database connected successfully',
    CONNECTION_FAILED: 'Database connection failed',
    DISCONNECTION_SUCCESS: 'Database disconnected successfully',
    QUERY_SUCCESS: 'Database query executed successfully',
    QUERY_FAILED: 'Database query failed',
    TRANSACTION_SUCCESS: 'Database transaction completed successfully',
    TRANSACTION_FAILED: 'Database transaction failed',
    INDEX_CREATED: 'Database index created successfully',
    INDEX_FAILED: 'Database index creation failed'
  }
};

// Helper function to get message by key path
const getMessage = (keyPath, defaultValue = 'Message not found') => {
  const keys = keyPath.split('.');
  let value = MESSAGES;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value || defaultValue;
};

// Helper function to get message with replacements
const getMessageWithReplacements = (keyPath, replacements = {}, defaultValue = 'Message not found') => {
  let message = getMessage(keyPath, defaultValue);
  
  // Replace placeholders with actual values
  Object.keys(replacements).forEach(key => {
    const placeholder = `{${key}}`;
    message = message.replace(new RegExp(placeholder, 'g'), replacements[key]);
  });
  
  return message;
};

module.exports = {
  MESSAGES,
  getMessage,
  getMessageWithReplacements
};
