// Role-based access control constants
const ROLES = {
  ADMIN: 1,
  MANAGER: 2,
  EMPLOYEE: 3
};

// Task status constants
const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Task priority constants
const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// HTTP status codes
const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// JWT token types
const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

// File upload constants
const FILE_TYPES = {
  PDF: 'application/pdf',
  JPG: 'image/jpeg',
  PNG: 'image/png'
};

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

// Rate limiting constants
const RATE_LIMITS = {
  NON_AUTH: {
    windowMs: 60000, // 1 minute
    max: 10
  },
  AUTH: {
    windowMs: 3600000, // 1 hour
    max: 100
  },
  UPLOAD: {
    windowMs: 300000, // 5 minutes
    max: 5
  }
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Email types
const EMAIL_TYPES = {
  WELCOME: 'welcome',
  TASK_ASSIGNMENT: 'task_assignment',
  TASK_UPDATE: 'task_update',
  TASK_REMINDER: 'task_reminder',
  TASK_COMPLETION: 'task_completion',
  REMINDER: 'reminder',
  NOTIFICATION: 'notification'
};

// Email status
const EMAIL_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed'
};

// Database collection names
const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  EMAILS: 'emails'
};

// Validation constants
const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  MAX_ATTACHMENTS_PER_TASK: 3,
  MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
};

module.exports = {
  ROLES,
  TASK_STATUS,
  TASK_PRIORITY,
  STATUS_CODES,
  TOKEN_TYPES,
  FILE_TYPES,
  ALLOWED_EXTENSIONS,
  RATE_LIMITS,
  PAGINATION,
  EMAIL_TYPES,
  EMAIL_STATUS,
  COLLECTIONS,
  VALIDATION
};
