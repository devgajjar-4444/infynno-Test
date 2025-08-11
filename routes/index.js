const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/tasks', require('./tasks'));
router.use('/reports', require('./reports'));
router.use('/emails', require('./emails'));
router.use('/export', require('./export'));

module.exports = router;

