const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');
const { verifyToken, requireAdmin } = require('../middlewares/auth');
const { createAuthRateLimiter } = require('../middlewares/rateLimit');
const reportValidator = require('../validators/reportValidator');

// Rate limiter for authenticated routes
const authRateLimiter = createAuthRateLimiter();

// Apply rate limiting to all routes
router.use(authRateLimiter);

// All report routes require admin access
router.use(verifyToken, requireAdmin);

// Get task summary report
router.get('/task-summary', reportValidator.validateTaskSummary, reportValidator.validateDateRange(), reportController.getTaskSummary);

// Get user performance report
router.get('/user-performance', reportValidator.validateUserPerformance, reportValidator.validateDateRange(), reportController.getUserPerformance);

// Get system health report
router.get('/system-health', reportValidator.validateSystemHealth, reportController.getSystemHealth);

module.exports = router;
