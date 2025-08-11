const Joi = require('joi');
const { TASK_STATUS, TASK_PRIORITY } = require('../constants');
const { getMessage } = require('../messages');
const { STATUS_CODES } = require('../constants');

// Export validation schemas
const exportSchemas = {
  tasks: Joi.object({
    format: Joi.string()
      .valid('csv', 'json')
      .default('csv')
      .messages({
        'any.only': getMessage('EXPORT.INVALID_FORMAT')
      }),
    filters: Joi.object({
      status: Joi.string()
        .valid(...Object.values(TASK_STATUS))
        .optional()
        .messages({
          'any.only': getMessage('TASK.INVALID_STATUS')
        }),
      priority: Joi.string()
        .valid(...Object.values(TASK_PRIORITY))
        .optional()
        .messages({
          'any.only': getMessage('TASK.INVALID_PRIORITY')
        }),
      assignedTo: Joi.string()
        .hex()
        .length(24)
        .optional()
        .messages({
          'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
          'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID')
        }),
      createdBy: Joi.string()
        .hex()
        .length(24)
        .optional()
        .messages({
          'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
          'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID')
        }),
      dueDateFrom: Joi.date()
        .optional()
        .messages({
          'date.base': getMessage('VALIDATION.INVALID_DATE')
        }),
      dueDateTo: Joi.date()
        .optional()
        .messages({
          'date.base': getMessage('VALIDATION.INVALID_DATE')
        })
    }).optional()
  }),

  users: Joi.object({
    format: Joi.string()
      .valid('csv', 'json')
      .default('csv')
      .messages({
        'any.only': getMessage('EXPORT.INVALID_FORMAT')
      }),
    role: Joi.string()
      .valid('admin', 'manager', 'employee')
      .optional()
      .messages({
        'any.only': getMessage('USER.INVALID_ROLE')
      }),
    isActive: Joi.string()
      .valid('true', 'false')
      .optional()
      .messages({
        'any.only': getMessage('VALIDATION.INVALID_BOOLEAN')
      })
  }),

  taskReports: Joi.object({
    format: Joi.string()
      .valid('csv', 'json')
      .default('csv')
      .messages({
        'any.only': getMessage('EXPORT.INVALID_FORMAT')
      }),
    startDate: Joi.date()
      .optional()
      .messages({
        'date.base': getMessage('VALIDATION.INVALID_DATE')
      }),
    endDate: Joi.date()
      .optional()
      .messages({
        'date.base': getMessage('VALIDATION.INVALID_DATE')
      })
  })
};

// Generic validation middleware factory
const createValidator = (schema, property = 'query') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: {
          message: getMessage('GENERAL.BAD_REQUEST'),
          details: errorDetails,
          statusCode: STATUS_CODES.BAD_REQUEST
        },
        timestamp: new Date().toISOString()
      });
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

// Export validation middleware
const exportValidator = {
  validateTasks: createValidator(exportSchemas.tasks),
  validateUsers: createValidator(exportSchemas.users),
  validateTaskReports: createValidator(exportSchemas.taskReports),
  
  // Date range validation middleware
  validateDateRange: (startField = 'dueDateFrom', endField = 'dueDateTo') => {
    return (req, res, next) => {
      const startDate = req.query[startField];
      const endDate = req.query[endField];
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            error: {
              message: getMessage('VALIDATION.INVALID_DATE_RANGE'),
              statusCode: STATUS_CODES.BAD_REQUEST
            },
            timestamp: new Date().toISOString()
          });
        }
      }
      
      next();
    };
  }
};

module.exports = exportValidator;
