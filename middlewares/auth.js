const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');
const { getMessage } = require('../messages');
const logger = require('../utils/logger');
const { ROLES, STATUS_CODES } = require('../constants');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError(getMessage('AUTH.TOKEN_REQUIRED'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify access token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Find user and check if still active
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      throw new AuthenticationError(getMessage('AUTH.USER_NOT_FOUND'));
    }

    // Check if token is still valid (access tokens don't need refresh token validation)
    // The JWT verification above is sufficient for access tokens

    // Attach user to request
    req.user = user;
    
    logger.auth('token_verified', user.id, true, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.auth('token_invalid', null, false, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error.message
      });
      next(new AuthenticationError(getMessage('AUTH.INVALID_TOKEN')));
    } else if (error.name === 'TokenExpiredError') {
      logger.auth('token_expired', null, false, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next(new AuthenticationError(getMessage('AUTH.INVALID_TOKEN')));
    } else {
      next(error);
    }
  }
};

// Role-based access control middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        logger.auth('role_access_denied', req.user.id, false, {
          requiredRoles: roles,
          userRole: req.user.role,
          endpoint: req.originalUrl
        });
        throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
      }

      logger.auth('role_access_granted', req.user.id, true, {
        requiredRoles: roles,
        userRole: req.user.role,
        endpoint: req.originalUrl
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Admin only middleware
const requireAdmin = requireRole(ROLES.ADMIN);

// Manager or Admin middleware
const requireManager = requireRole(ROLES.ADMIN, ROLES.MANAGER);

// Employee or higher middleware
const requireEmployee = requireRole(ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE);

// Check if user owns resource or has admin access
const requireOwnership = (resourceModel, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // Admin can access everything
      if (req.user.role === ROLES.ADMIN) {
        return next();
      }

      const resourceId = req.params[resourceIdField];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        throw new Error('Resource not found');
      }

      // Check ownership based on resource type
      let hasAccess = false;

      if (resourceModel.modelName === 'Task') {
        // For tasks: creator, assignee, or manager can access
        hasAccess = resource.createdBy.equals(req.user.id) ||
                   resource.assignedTo.equals(req.user.id) ||
                   req.user.role === ROLES.MANAGER;
      } else if (resourceModel.modelName === 'User') {
        // For users: only admin or self
        hasAccess = req.user.id === resourceId;
      } else {
        // Default: only creator or admin
        hasAccess = resource.createdBy && resource.createdBy.equals(req.user.id);
      }

      if (!hasAccess) {
        logger.auth('resource_access_denied', req.user.id, false, {
          resourceType: resourceModel.modelName,
          resourceId,
          endpoint: req.originalUrl
        });
        throw new AuthorizationError('Access denied to this resource');
      }

      logger.auth('resource_access_granted', req.user.id, true, {
        resourceType: resourceModel.modelName,
        resourceId,
        endpoint: req.originalUrl
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Optional authentication middleware (for routes that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        logger.auth('optional_auth_success', user.id, true);
      }
    } catch (error) {
      // Token is invalid, but we continue without user
      logger.auth('optional_auth_failed', null, false, { error: error.message });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Refresh token verification middleware
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user and verify refresh token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Check if refresh token is valid
    if (!user.verifyRefreshToken(refreshToken)) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    req.user = user;
    req.refreshToken = refreshToken;
    
    logger.auth('refresh_token_verified', user.id, true, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.auth('refresh_token_invalid', null, false, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error.message
      });
      next(new AuthenticationError('Invalid refresh token'));
    } else if (error.name === 'TokenExpiredError') {
      logger.auth('refresh_token_expired', null, false, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next(new AuthenticationError('Refresh token expired'));
    } else {
      next(error);
    }
  }
};

// Rate limiting middleware for authenticated routes
const createAuthRateLimiter = (rateLimit) => {
  return (req, res, next) => {
    // Skip rate limiting for admin users
  if (req.user && req.user.role === ROLES.ADMIN) {
      return next();
    }
    
    return rateLimit(req, res, next);
  };
};

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireManager,
  requireEmployee,
  requireOwnership,
  optionalAuth,
  verifyRefreshToken,
  createAuthRateLimiter
};
