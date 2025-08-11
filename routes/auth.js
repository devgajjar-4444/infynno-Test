
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middlewares/auth');
const { createNonAuthRateLimiter, createAuthAttemptRateLimiter } = require('../middlewares/rateLimit');
const authValidator = require('../validators/authValidator');

// Public routes (no authentication required)

router.post('/register', authValidator.validateRegister, authController.register);
router.post('/login', authValidator.validateLogin, authController.login);
router.post('/refresh', authValidator.validateRefreshToken, authController.refreshToken);

// Protected routes (authentication required)

router.post('/logout', verifyToken, authController.logout);
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authValidator.validateUpdateProfile, authController.updateProfile);
router.put('/change-password', verifyToken, authValidator.validateChangePassword, authController.changePassword);

// Admin routes

router.get('/users', verifyToken, requireAdmin, authController.getAllUsers);
router.put('/users/:userId/role', verifyToken, requireAdmin, authValidator.validateUserId, authValidator.validateUpdateUserRole, authController.updateUserRole);
router.put('/users/:userId/status', verifyToken, requireAdmin, authValidator.validateUserId, authController.toggleUserStatus);

module.exports = router;
