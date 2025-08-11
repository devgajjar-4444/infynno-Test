const Joi = require('joi');
const { getMessage } = require('../messages');
const { STATUS_CODES } = require('../constants');

// Report validation schemas
const reportSchemas = {
  taskSummary: Joi.object({
    startDate: Joi.date()
      .optional()
      .messages({
        'date.base': getMessage('VALIDATION.INVALID_DATE')
      }),
    endDate: Joi.date()
      .optional()
      .messages({
        'date.base': getMessage('VALIDATION.INVALID_DATE')
      }),
    groupBy: Joi.string()
      .valid('day', 'week', 'month')
      .default('month')
      .messages({
        'any.only': getMessage('REPORT.INVALID_GROUP_BY')
      })
  }),

  userPerformance: Joi.object({
    startDate: Joi.date()
      .optional()
      .messages({
        'date.base': getMessage('VALIDATION.INVALID_DATE')
      }),
    endDate: Joi.date()
      .optional()
      .messages({
        'date.base': getMessage('VALIDATION.INVALID_DATE')
      }),
    userId: Joi.string()
      .hex()
      .length(24)
      .optional()
      .messages({
        'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID')
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.integer': getMessage('VALIDATION.INVALID_LIMIT'),
        'number.min': getMessage('VALIDATION.INVALID_LIMIT'),
        'number.max': getMessage('VALIDATION.INVALID_LIMIT')
      })
  }),

  systemHealth: Joi.object({
    includeDetails: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': getMessage('VALIDATION.INVALID_BOOLEAN')
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

// Report validation middleware
const reportValidator = {
  validateTaskSummary: createValidator(reportSchemas.taskSummary),
  validateUserPerformance: createValidator(reportSchemas.userPerformance),
  validateSystemHealth: createValidator(reportSchemas.systemHealth),
  
  // Date range validation middleware
  validateDateRange: (startField = 'startDate', endField = 'endDate') => {
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

module.exports = reportValidator;
