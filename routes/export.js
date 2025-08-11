const express = require('express');
const router = express.Router();

const exportController = require('../controllers/exportController');
const { verifyToken, requireAdmin } = require('../middlewares/auth');
const { createAuthRateLimiter } = require('../middlewares/rateLimit');
const exportValidator = require('../validators/exportValidator');

// Rate limiter for authenticated routes
const authRateLimiter = createAuthRateLimiter();

// Apply rate limiting to all routes
router.use(authRateLimiter);

// All export routes require admin access
router.use(verifyToken, requireAdmin);

// Export tasks as CSV or JSON
router.get('/tasks', exportValidator.validateTasks, exportValidator.validateDateRange(), exportController.exportTasks);

// Export users as CSV or JSON
router.get('/users', exportValidator.validateUsers, exportController.exportUsers);

// Export task reports as CSV or JSON
router.get('/reports', exportValidator.validateTaskReports, exportValidator.validateDateRange('startDate', 'endDate'), exportController.exportTaskReports);

module.exports = router;
