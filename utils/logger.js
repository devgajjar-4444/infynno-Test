const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const logFiles = {
  error: path.join(logsDir, 'error.log'),
  combined: path.join(logsDir, 'combined.log'),
  access: path.join(logsDir, 'access.log')
};

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// Helper function to format timestamp
const formatTimestamp = () => {
  return new Date().toISOString();
};

// Helper function to format log message
const formatLogMessage = (level, message, meta = {}) => {
  const timestamp = formatTimestamp();
  const logData = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta
  };

  // Remove undefined values
  Object.keys(logData).forEach(key => {
    if (logData[key] === undefined) {
      delete logData[key];
    }
  });

  return JSON.stringify(logData);
};

// Helper function to write to file
const writeToFile = (filePath, content) => {
  try {
    fs.appendFileSync(filePath, content + '\n');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
};

// Helper function to check if should log
const shouldLog = (level) => {
  return LOG_LEVELS[level.toUpperCase()] <= currentLogLevel;
};

// Main logger object
const logger = {
  error: (message, meta = {}) => {
    if (shouldLog('ERROR')) {
      const logMessage = formatLogMessage('error', message, meta);
      console.error(logMessage);
      writeToFile(logFiles.error, logMessage);
      writeToFile(logFiles.combined, logMessage);
    }
  },

  warn: (message, meta = {}) => {
    if (shouldLog('WARN')) {
      const logMessage = formatLogMessage('warn', message, meta);
      console.warn(logMessage);
      writeToFile(logFiles.combined, logMessage);
    }
  },

  info: (message, meta = {}) => {
    if (shouldLog('INFO')) {
      const logMessage = formatLogMessage('info', message, meta);
      console.info(logMessage);
      writeToFile(logFiles.combined, logMessage);
    }
  },

  debug: (message, meta = {}) => {
    if (shouldLog('DEBUG')) {
      const logMessage = formatLogMessage('debug', message, meta);
      console.debug(logMessage);
      writeToFile(logFiles.combined, logMessage);
    }
  },

  // Special method for access logs
  access: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      timestamp: formatTimestamp()
    };

    const logMessage = JSON.stringify(logData);
    writeToFile(logFiles.access, logMessage);
  },

  // Method to log HTTP requests
  http: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - start;
      logger.access(req, res, responseTime);
    });

    next();
  },

  // Method to log database operations
  db: (operation, collection, documentId, duration, success = true) => {
    const message = `DB ${operation} on ${collection}`;
    const meta = {
      operation,
      collection,
      documentId,
      duration: `${duration}ms`,
      success
    };

    if (success) {
      logger.debug(message, meta);
    } else {
      logger.error(message, meta);
    }
  },

  // Method to log authentication events
  auth: (event, userId, success = true, details = {}) => {
    const message = `Authentication ${event}`;
    const meta = {
      event,
      userId,
      success,
      ...details
    };

    if (success) {
      logger.info(message, meta);
    } else {
      logger.warn(message, meta);
    }
  },

  // Method to log task operations
  task: (operation, taskId, userId, details = {}) => {
    const message = `Task ${operation}`;
    const meta = {
      operation,
      taskId,
      userId,
      ...details
    };

    logger.info(message, meta);
  },

  // Method to log file operations
  file: (operation, filename, userId, success = true, details = {}) => {
    const message = `File ${operation}`;
    const meta = {
      operation,
      filename,
      userId,
      success,
      ...details
    };

    if (success) {
      logger.info(message, meta);
    } else {
      logger.error(message, meta);
    }
  },

  // Method to log rate limiting events
  rateLimit: (ip, endpoint, limit, windowMs) => {
    const message = 'Rate limit exceeded';
    const meta = {
      ip,
      endpoint,
      limit,
      windowMs: `${windowMs}ms`
    };

    logger.warn(message, meta);
  },

  // Method to log email processing
  email: (operation, emailId, recipient, success = true, details = {}) => {
    const message = `Email ${operation}`;
    const meta = {
      operation,
      emailId,
      recipient,
      success,
      ...details
    };

    if (success) {
      logger.info(message, meta);
    } else {
      logger.error(message, meta);
    }
  },

  // Method to get log statistics
  getStats: () => {
    try {
      const stats = {};
      
      Object.keys(logFiles).forEach(level => {
        const filePath = logFiles[level];
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          stats[level] = lines.length;
        } else {
          stats[level] = 0;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting log stats:', error);
      return {};
    }
  },

  // Method to clean old logs
  cleanOldLogs: (daysToKeep = 30) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      Object.keys(logFiles).forEach(level => {
        const filePath = logFiles[level];
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            logger.info(`Cleaned old log file: ${level}`);
          }
        }
      });
    } catch (error) {
      logger.error('Error cleaning old logs:', { error: error.message });
    }
  }
};

// Export logger
module.exports = logger;
