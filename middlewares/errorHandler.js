const logger = require('../utils/logger');
const { STATUS_CODES } = require('../constants');
const { getMessage } = require('../messages');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, STATUS_CODES.BAD_REQUEST);
    this.details = details;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = getMessage('GENERAL.UNAUTHORIZED')) {
    super(message, STATUS_CODES.UNAUTHORIZED);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = getMessage('GENERAL.FORBIDDEN')) {
    super(message, STATUS_CODES.FORBIDDEN);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(getMessage('GENERAL.NOT_FOUND'), STATUS_CODES.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = getMessage('GENERAL.ERROR')) {
    super(message, STATUS_CODES.CONFLICT);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = getMessage('RATE_LIMIT.TOO_MANY_REQUESTS')) {
    super(message, STATUS_CODES.TOO_MANY_REQUESTS);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = getMessage('VALIDATION.INVALID_OBJECT_ID');
    error = new ValidationError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = getMessage('GENERAL.ERROR');
    error = new ConflictError(message);
  }

  // Custom validation error (our own ValidationError with details)
  if (err instanceof ValidationError || (err.name === 'ValidationError' && err.details)) {
    error = err;
  }

  // Mongoose validation error
  if (!error.details && err.name === 'ValidationError' && err.errors) {
    const message = getMessage('GENERAL.VALIDATION_ERROR');
    const details = Object.values(err.errors || {}).map(val => val.message);
    error = new ValidationError(message, details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError(getMessage('AUTH.INVALID_TOKEN'));
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError(getMessage('AUTH.INVALID_TOKEN'));
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError(getMessage('TASK.FILE_TOO_LARGE'));
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new ValidationError(getMessage('RATE_LIMIT.UPLOAD_LIMIT_EXCEEDED'));
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ValidationError(getMessage('GENERAL.BAD_REQUEST'));
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = new RateLimitError(getMessage('RATE_LIMIT.TOO_MANY_REQUESTS'));
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || getMessage('GENERAL.INTERNAL_ERROR');

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode,
        stack: err.stack,
        details: error.details || null
      },
      timestamp: new Date().toISOString(),
      path: req.url
    });
  }

  // Production error response
  if (error.isOperational) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode
      },
      timestamp: new Date().toISOString()
    });
  }

  // Programming or unknown errors
  return res.status(500).json({
    success: false,
    error: {
      message: 'Something went wrong',
      statusCode: 500
    },
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
};
