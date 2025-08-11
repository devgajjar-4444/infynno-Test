const { ValidationError } = require('./errorHandler');
const logger = require('../utils/logger');
const { VALIDATION, PAGINATION } = require('../constants');
const { getMessage } = require('../messages');

// Generic validation middleware
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        // Format validation errors
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation failed', {
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
          errors: errorDetails
        });

        throw new ValidationError('Validation failed', errorDetails);
      }

      // Replace request data with validated data
      req[property] = value;
      
      logger.debug('Validation passed', {
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate request body
const validateBody = (schema) => validate(schema, 'body');

// Validate request query parameters
const validateQuery = (schema) => validate(schema, 'query');

// Validate request parameters
const validateParams = (schema) => validate(schema, 'params');

// Validate multiple properties
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    try {
      const errors = [];

      // Validate each property
      Object.keys(schemas).forEach(property => {
        const schema = schemas[property];
        const { error, value } = schema.validate(req[property], {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          const errorDetails = error.details.map(detail => ({
            property,
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          errors.push(...errorDetails);
        } else {
          // Replace request data with validated data
          req[property] = value;
        }
      });

      if (errors.length > 0) {
        logger.warn('Multiple validation failed', {
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
          errors
        });

        throw new ValidationError('Validation failed', errors);
      }

      logger.debug('Multiple validation passed', {
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate MongoDB ObjectId
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const id = req.params[paramName];
      
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        logger.warn('Invalid ObjectId', {
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
          paramName,
          value: id
        });

        throw new ValidationError(getMessage('VALIDATION.INVALID_OBJECT_ID'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate pagination parameters
const validatePagination = () => {
  return (req, res, next) => {
    try {
      const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      if (isNaN(pageNum) || pageNum < 1) {
        throw new ValidationError(getMessage('VALIDATION.INVALID_PAGE_NUMBER'));
      }
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > PAGINATION.MAX_LIMIT) {
        throw new ValidationError(getMessage('VALIDATION.INVALID_LIMIT'));
      }
      
      // Update query with validated values
      req.query.page = pageNum;
      req.query.limit = limitNum;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate date range
const validateDateRange = (startField = 'startDate', endField = 'endDate') => {
  return (req, res, next) => {
    try {
      const { [startField]: startDate, [endField]: endDate } = req.query;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new ValidationError(getMessage('VALIDATION.INVALID_DATE'));
        }
        
        if (start > end) {
          throw new ValidationError(getMessage('GENERAL.BAD_REQUEST'));
        }
        
        // Update query with validated dates
        req.query[startField] = start;
        req.query[endField] = end;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate file upload requirements
const validateFileUpload = (required = false, maxFiles = VALIDATION.MAX_ATTACHMENTS_PER_TASK) => {
  return (req, res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      
      if (required && files.length === 0) {
        throw new ValidationError(getMessage('FILE.UPLOAD_FAILED'));
      }
      
      if (files.length > maxFiles) {
        throw new ValidationError(getMessage('TASK.MAX_ATTACHMENTS_REACHED'));
      }
      
      // Validate each file
      files.forEach((file, index) => {
        if (!file.originalname || !file.mimetype || !file.size) {
          throw new ValidationError(getMessage('FILE.UPLOAD_FAILED'));
        }
        
        // Check file size (5MB limit)
        const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new ValidationError(getMessage('TASK.FILE_TOO_LARGE'));
        }
        
        // Check file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
          throw new ValidationError(getMessage('TASK.INVALID_FILE_TYPE'));
        }
      });
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate search parameters
const validateSearch = (minLength = VALIDATION.TITLE_MIN_LENGTH, maxLength = VALIDATION.TITLE_MAX_LENGTH) => {
  return (req, res, next) => {
    try {
      const { search } = req.query;
      
      if (search) {
        if (typeof search !== 'string') {
          throw new ValidationError(getMessage('GENERAL.BAD_REQUEST'));
        }
        
        if (search.length < minLength) {
          throw new ValidationError(getMessage('VALIDATION.INVALID_SEARCH_TERM'));
        }
        
        if (search.length > maxLength) {
          throw new ValidationError(getMessage('VALIDATION.DESCRIPTION_TOO_LONG'));
        }
        
        // Sanitize search term (remove special characters, trim)
        req.query.search = search.trim().replace(/[^\w\s]/gi, '');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Validate sorting parameters
const validateSorting = (allowedFields = [], defaultField = 'createdAt', defaultOrder = 'desc') => {
  return (req, res, next) => {
    try {
      let { sortBy = defaultField, sortOrder = defaultOrder } = req.query;
      
      // Validate sort field
      if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
        throw new ValidationError(getMessage('GENERAL.BAD_REQUEST'));
      }
      
      // Validate sort order
      if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
        throw new ValidationError(getMessage('GENERAL.BAD_REQUEST'));
      }
      
      // Update query with validated values
      req.query.sortBy = sortBy;
      req.query.sortOrder = sortOrder.toLowerCase();
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Sanitize input data
const sanitizeInput = () => {
  return (req, res, next) => {
    try {
      // Sanitize body
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim();
          }
        });
      }
      
      // Sanitize query
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string') {
            req.query[key] = req.query[key].trim();
          }
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  validateObjectId,
  validatePagination,
  validateDateRange,
  validateFileUpload,
  validateSearch,
  validateSorting,
  sanitizeInput
};
