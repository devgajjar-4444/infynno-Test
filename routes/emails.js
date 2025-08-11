const express = require('express');
const router = express.Router();

const emailController = require('../controllers/emailController');
const { verifyToken, requireAdmin } = require('../middlewares/auth');
const { createAuthRateLimiter } = require('../middlewares/rateLimit');
const emailValidator = require('../validators/emailValidator');

// Rate limiter for authenticated routes
const authRateLimiter = createAuthRateLimiter();

// Apply rate limiting to all routes
router.use(authRateLimiter);

// Get email queue status (admin only)
router.get('/queue-status', verifyToken, requireAdmin, emailController.getQueueStatus);

// Simulate email processing (admin only)
router.post('/simulate-email-processing', verifyToken, requireAdmin, emailValidator.validateSimulate, emailController.simulateEmailProcessing);

// Clear email queue (admin only)
router.delete('/queue', verifyToken, requireAdmin, emailController.clearQueue);

// Get failed emails (admin only)
router.get('/failed', verifyToken, requireAdmin, emailValidator.validateGetFailedEmails, emailController.getFailedEmails);

// Retry failed email (admin only)
router.post('/retry/:emailId', verifyToken, requireAdmin, emailValidator.validateEmailId, emailController.retryFailedEmail);

// Manual email processing (admin only)
router.post('/process-manual', verifyToken, requireAdmin, emailValidator.validateProcessManual, emailController.processManualEmail);

module.exports = router;
