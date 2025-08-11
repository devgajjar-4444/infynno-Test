const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ValidationError } = require('./errorHandler');
const logger = require('../utils/logger');
const { FILE_TYPES, ALLOWED_EXTENSIONS, VALIDATION } = require('../constants');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectories based on file type
    const fileType = file.mimetype.split('/')[0];
    const subDir = path.join(uploadsDir, fileType);
    
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimeTypes = Object.values(FILE_TYPES);
  const allowedExtensions = ALLOWED_EXTENSIONS;
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimeTypes.includes(file.mimetype) || 
      !allowedExtensions.includes(fileExtension)) {
    logger.file('upload_rejected', file.originalname, req.user?.id, false, {
      reason: 'Invalid file type',
      mimeType: file.mimetype,
      extension: fileExtension
    });
    
    return cb(new ValidationError(
      `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`
    ), false);
  }
  
  // Check file size (5MB limit)
  const maxSize = VALIDATION.MAX_FILE_SIZE;
  
  if (file.size > maxSize) {
    logger.file('upload_rejected', file.originalname, req.user?.id, false, {
      reason: 'File too large',
      fileSize: file.size,
      maxSize
    });
    
    return cb(new ValidationError(
      `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
    ), false);
  }
  
  // File is valid
  logger.file('upload_validated', file.originalname, req.user?.id, true, {
    mimeType: file.mimetype,
    size: file.size
  });
  
  cb(null, true);
};

// Configure multer for single file upload
const uploadSingle = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: VALIDATION.MAX_FILE_SIZE,
    files: 1
  }
}).single('file');

// Configure multer for multiple file uploads (max 3)
const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: VALIDATION.MAX_FILE_SIZE,
    files: 3
  }
}).array('files', 3);

// Wrapper for single file upload with error handling
const uploadSingleFile = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ValidationError('File size too large'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new ValidationError('Too many files'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new ValidationError('Unexpected file field'));
      }
      return next(new ValidationError('File upload error'));
    } else if (err) {
      return next(err);
    }
    
    // Log successful upload
    if (req.file) {
      logger.file('upload_success', req.file.originalname, req.user?.id, true, {
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype
      });
    }
    
    next();
  });
};

// Wrapper for multiple file uploads with error handling
const uploadMultipleFiles = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ValidationError('File size too large'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new ValidationError('Maximum 3 files allowed'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new ValidationError('Unexpected file field'));
      }
      return next(new ValidationError('File upload error'));
    } else if (err) {
      return next(err);
    }
    
    // Log successful uploads
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        logger.file('upload_success', file.originalname, req.user?.id, true, {
          filename: file.filename,
          size: file.size,
          mimeType: file.mimetype
        });
      });
    }
    
    next();
  });
};

// Middleware to validate file count for tasks (max 3 attachments)
const validateTaskAttachments = (req, res, next) => {
  if (req.files && req.files.length > 3) {
    logger.file('upload_rejected', 'multiple_files', req.user?.id, false, {
      reason: 'Too many files for task',
      fileCount: req.files.length,
      maxAllowed: 3
    });
    
    return next(new ValidationError('Maximum 3 attachments allowed per task'));
  }
  
  next();
};

// Middleware to clean up uploaded files on error
const cleanupUploads = (req, res, next) => {
  // Store original files for cleanup
  const originalFiles = req.files ? [...req.files] : (req.file ? [req.file] : []);
  
  // Override res.end to clean up files on error
  const originalEnd = res.end;
  res.end = function(data, encoding) {
    // If response indicates error, clean up uploaded files
    if (res.statusCode >= 400) {
      originalFiles.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            logger.file('cleanup_success', file.originalname, req.user?.id, true, {
              reason: 'Response error',
              statusCode: res.statusCode
            });
          }
        } catch (error) {
          logger.file('cleanup_failed', file.originalname, req.user?.id, false, {
            error: error.message
          });
        }
      });
    }
    
    // Call original end method
    originalEnd.call(this, data, encoding);
  };
  
  next();
};

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.file('delete_success', path.basename(filePath), null, true);
      return true;
    }
    return false;
  } catch (error) {
    logger.file('delete_failed', path.basename(filePath), null, false, {
      error: error.message
    });
    return false;
  }
};

// Utility function to get file info
const getFileInfo = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    }
    return { exists: false };
  } catch (error) {
    logger.error('Error getting file info', { filePath, error: error.message });
    return { exists: false, error: error.message };
  }
};

// Utility function to move file
const moveFile = (oldPath, newPath) => {
  try {
    if (fs.existsSync(oldPath)) {
      // Create directory if it doesn't exist
      const newDir = path.dirname(newPath);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }
      
      fs.renameSync(oldPath, newPath);
      logger.file('move_success', path.basename(oldPath), null, true, {
        from: oldPath,
        to: newPath
      });
      return true;
    }
    return false;
  } catch (error) {
    logger.file('move_failed', path.basename(oldPath), null, false, {
      error: error.message,
      from: oldPath,
      to: newPath
    });
    return false;
  }
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  validateTaskAttachments,
  cleanupUploads,
  deleteFile,
  getFileInfo,
  moveFile,
  storage,
  fileFilter
};
