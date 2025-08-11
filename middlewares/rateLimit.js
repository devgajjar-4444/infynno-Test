const rateLimit = require('express-rate-limit');
const { RATE_LIMITS } = require('../constants');
const logger = require('../utils/logger');

// Rate limiter for non-authenticated routes (login, refresh, register)
const createNonAuthRateLimiter = () => {
  return rateLimit({
    windowMs: RATE_LIMITS.NON_AUTH.windowMs,
    max: RATE_LIMITS.NON_AUTH.max,
    message: {
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later',
        statusCode: 429
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.rateLimit(
        req.ip,
        req.originalUrl,
        parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
        parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000
      );
      
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests from this IP, please try again later',
          statusCode: 429
        },
        timestamp: new Date().toISOString()
      });
    },
    keyGenerator: (req) => {
      // Use IP address as key for non-authenticated routes
      return req.ip || req.connection.remoteAddress;
    },
    skip: (req) => {
      // Skip rate limiting for health check and other essential endpoints
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

// Rate limiter for authenticated routes
const createAuthRateLimiter = () => {
  return rateLimit({
    windowMs: RATE_LIMITS.AUTH.windowMs,
    max: RATE_LIMITS.AUTH.max,
    message: {
      success: false,
      error: {
        message: 'Too many requests for this user, please try again later',
        statusCode: 429
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.rateLimit(
        req.ip,
        req.originalUrl,
        parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 100,
        parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000
      );
      
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests for this user, please try again later',
          statusCode: 429
        },
        timestamp: new Date().toISOString()
      });
    },
    keyGenerator: (req) => {
      // Use user ID as key for authenticated routes
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user && req.user.role === 'admin';
    }
  });
};

// Rate limiter for file uploads (more restrictive)
const createUploadRateLimiter = () => {
  return rateLimit({
    windowMs: RATE_LIMITS.UPLOAD.windowMs,
    max: RATE_LIMITS.UPLOAD.max,
    message: {
      success: false,
      error: {
        message: 'Too many file uploads, please try again later',
        statusCode: 429
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.rateLimit(
        req.ip,
        req.originalUrl,
        10,
        15 * 60 * 1000
      );
      
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many file uploads, please try again later',
          statusCode: 429
        },
        timestamp: new Date().toISOString()
      });
    },
    keyGenerator: (req) => {
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      return req.user && req.user.role === 'admin';
    }
  });
};

// Rate limiter for authentication attempts (very restrictive)
const createAuthAttemptRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: {
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later',
        statusCode: 429
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.rateLimit(
        req.ip,
        req.originalUrl,
        5,
        15 * 60 * 1000
      );
      
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many authentication attempts, please try again later',
          statusCode: 429
        },
        timestamp: new Date().toISOString()
      });
    },
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress;
    }
  });
};

// Rate limiter for API endpoints (general)
const createApiRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
      success: false,
      error: {
        message: 'API rate limit exceeded, please try again later',
        statusCode: 429
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.rateLimit(
        req.ip,
        req.originalUrl,
        60,
        60 * 1000
      );
      
      res.status(429).json({
        success: false,
        error: {
          message: 'API rate limit exceeded, please try again later',
          statusCode: 429
        },
        timestamp: new Date().toISOString()
      });
    },
    keyGenerator: (req) => {
      return req.user ? req.user.id : req.ip;
    },
    skip: (req) => {
      return req.user && req.user.role === 'admin';
    }
  });
};

// Dynamic rate limiter based on user role
const createDynamicRateLimiter = () => {
  return (req, res, next) => {
    let limiter;
    
    if (req.user) {
      // Authenticated users get different limits based on role
      switch (req.user.role) {
        case 'admin':
          // Admin users have no rate limiting
          return next();
        case 'manager':
          // Managers get higher limits
          limiter = rateLimit({
            windowMs: 60 * 1000,
            max: 200,
            keyGenerator: () => req.user.id
          });
          break;
        case 'employee':
          // Employees get standard limits
          limiter = rateLimit({
            windowMs: 60 * 1000,
            max: 100,
            keyGenerator: () => req.user.id
          });
          break;
        default:
          // Default limit
          limiter = rateLimit({
            windowMs: 60 * 1000,
            max: 50,
            keyGenerator: () => req.user.id
          });
      }
    } else {
      // Non-authenticated users get strict limits
      limiter = rateLimit({
        windowMs: 60 * 1000,
        max: 20,
        keyGenerator: () => req.ip
      });
    }
    
    limiter(req, res, next);
  };
};

module.exports = {
  createNonAuthRateLimiter,
  createAuthRateLimiter,
  createUploadRateLimiter,
  createAuthAttemptRateLimiter,
  createApiRateLimiter,
  createDynamicRateLimiter
};
