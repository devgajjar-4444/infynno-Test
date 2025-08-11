const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middlewares/errorHandler');
const { userValidation } = require('../utils/validation');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { getMessage } = require('../messages');
const { STATUS_CODES, ROLES } = require('../constants');

// User registration
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.auth('register_failed', null, false, {
      reason: 'User already exists',
      email
    });
    
    return res.status(STATUS_CODES.CONFLICT).json({
      success: false,
      error: {
        message: getMessage('AUTH.EMAIL_EXISTS'),
        statusCode: STATUS_CODES.CONFLICT
      },
      timestamp: new Date().toISOString()
    });
  }

  // Role comes validated (numeric) via Joi. Default to EMPLOYEE.
  const userRole = (role === ROLES.MANAGER) ? ROLES.MANAGER : ROLES.EMPLOYEE;

  // Prevent admin creation through registration
  if (userRole === ROLES.ADMIN) {
    return res.status(STATUS_CODES.FORBIDDEN).json({
      success: false,
      error: {
        message: 'Admin users cannot be created through registration',
        statusCode: STATUS_CODES.FORBIDDEN
      },
      timestamp: new Date().toISOString()
    });
  }

  // Create new user
  const user = new User({
    name,
    email,
    password,
    role: userRole
  });

  await user.save();

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  await user.save();

  // Simulate welcome email
  try {
    await emailService.sendWelcomeEmail(user);
    logger.email('welcome_sent', null, user.email, true, {
      userId: user.id,
      userName: user.name
    });
  } catch (error) {
    logger.email('welcome_failed', null, user.email, false, {
      userId: user.id,
      error: error.message
    });
  }

  logger.auth('register_success', user.id, true, {
    email,
    role: user.role
  });

  res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: getMessage('AUTH.REGISTER_SUCCESS'),
    data: {
      user: user.publicProfile,
      tokens: {
        accessToken,
        refreshToken
      }
    },
    timestamp: new Date().toISOString()
  });
});

// User login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !user.isActive) {
    logger.auth('login_failed', null, false, {
      reason: 'User not found or inactive',
      email
    });
    
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: {
        message: getMessage('AUTH.INVALID_CREDENTIALS'),
        statusCode: STATUS_CODES.UNAUTHORIZED
      },
      timestamp: new Date().toISOString()
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logger.auth('login_failed', user.id, false, {
      reason: 'Invalid password',
      email
    });
    
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: {
        message: getMessage('AUTH.INVALID_CREDENTIALS'),
        statusCode: STATUS_CODES.UNAUTHORIZED
      },
      timestamp: new Date().toISOString()
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate new tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  await user.save();

  logger.auth('login_success', user.id, true, {
    email,
    role: user.role,
    lastLogin: user.lastLogin
  });

  res.status(STATUS_CODES.OK).json({
    success: true,
    message: getMessage('AUTH.LOGIN_SUCCESS'),
    data: {
      user: user.publicProfile,
      tokens: {
        accessToken,
        refreshToken
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Refresh access token
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: {
        message: getMessage('AUTH.INVALID_REFRESH_TOKEN'),
        statusCode: STATUS_CODES.BAD_REQUEST
      },
      timestamp: new Date().toISOString()
    });
  }

  // Verify refresh token
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  
  // Find user
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    logger.auth('refresh_failed', null, false, {
      reason: 'User not found or inactive'
    });
    
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: {
        message: getMessage('AUTH.INVALID_REFRESH_TOKEN'),
        statusCode: STATUS_CODES.UNAUTHORIZED
      },
      timestamp: new Date().toISOString()
    });
  }

  // Verify stored refresh token
  if (!user.verifyRefreshToken(token)) {
    logger.auth('refresh_failed', user.id, false, {
      reason: 'Invalid or expired refresh token'
    });
    
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: {
        message: getMessage('AUTH.REFRESH_TOKEN_EXPIRED'),
        statusCode: STATUS_CODES.UNAUTHORIZED
      },
      timestamp: new Date().toISOString()
    });
  }

  // Generate new access token
  const newAccessToken = user.generateAccessToken();

  logger.auth('refresh_success', user.id, true);

  res.status(STATUS_CODES.OK).json({
    success: true,
    message: getMessage('AUTH.TOKEN_REFRESH_SUCCESS'),
    data: {
      accessToken: newAccessToken
    },
    timestamp: new Date().toISOString()
  });
});

// User logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (token) {
    // Remove refresh token from user
    req.user.removeRefreshToken(token);
    await req.user.save();
    
    logger.auth('logout_success', req.user.id, true, {
      tokenRemoved: true
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logout successful',
    timestamp: new Date().toISOString()
  });
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user.publicProfile
    },
    timestamp: new Date().toISOString()
  });
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const updates = {};

  if (name) updates.name = name;

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  logger.auth('profile_updated', req.user.id, true, {
    updatedFields: Object.keys(updates)
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser.publicProfile
    },
    timestamp: new Date().toISOString()
  });
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Verify current password
  const user = await User.findById(req.user.id).select('+password');
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isCurrentPasswordValid) {
    logger.auth('password_change_failed', req.user.id, false, {
      reason: 'Invalid current password'
    });
    
    return res.status(400).json({
      success: false,
      error: {
        message: 'Current password is incorrect',
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Remove refresh token (force re-login)
  user.refreshToken = { token: null, expiresAt: null };
  await user.save();

  logger.auth('password_changed', req.user.id, true);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully. Please login again.',
    timestamp: new Date().toISOString()
  });
});

// Admin: Get all users
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search, isActive } = req.query;
  
  const query = {};
  
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit);

  logger.auth('users_retrieved', req.user.id, true, {
    count: users.length,
    total,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: {
      users,
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

// Admin: Update user role
const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Prevent admin from changing their own role
  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Cannot change your own role',
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }

  // Role comes validated (numeric) via Joi
  const userRole = role;

  user.role = userRole;
  await user.save();

  logger.auth('user_role_updated', req.user.id, true, {
    targetUserId: userId,
    newRole: role
  });

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: {
      user: user.publicProfile
    },
    timestamp: new Date().toISOString()
  });
});

// Admin: Deactivate/Activate user
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'User not found',
        statusCode: 404
      },
      timestamp: new Date().toISOString()
    });
  }

  // Prevent admin from deactivating themselves
  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Cannot deactivate your own account',
        statusCode: 400
      },
      timestamp: new Date().toISOString()
    });
  }

  user.isActive = !user.isActive;
  await user.save();

  // If deactivating, remove refresh token
  if (!user.isActive) {
    user.refreshToken = { token: null, expiresAt: null };
    await user.save();
  }

  logger.auth('user_status_toggled', req.user.id, true, {
    targetUserId: userId,
    newStatus: user.isActive
  });

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      user: user.publicProfile
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  updateUserRole,
  toggleUserStatus
};
