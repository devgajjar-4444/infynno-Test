const Joi = require('joi');
const { getMessage } = require('../messages');
const { STATUS_CODES } = require('../constants');

// Email validation schemas
const emailSchemas = {
  simulate: Joi.object({
    batchSize: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10)
      .messages({
        'number.integer': getMessage('VALIDATION.INVALID_NUMBER'),
        'number.min': getMessage('VALIDATION.INVALID_BATCH_SIZE'),
        'number.max': getMessage('VALIDATION.INVALID_BATCH_SIZE')
      })
  }),

  processManual: Joi.object({
    emailType: Joi.string()
      .valid('welcome', 'task_assignment', 'task_update', 'task_reminder', 'task_completion')
      .required()
      .messages({
        'any.only': getMessage('EMAIL.INVALID_EMAIL_TYPE'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),
    recipientId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),
    taskId: Joi.string()
      .hex()
      .length(24)
      .optional()
      .messages({
        'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID')
      }),
    customMessage: Joi.string()
      .max(1000)
      .optional()
      .messages({
        'string.max': getMessage('EMAIL.MESSAGE_TOO_LONG')
      })
  }),

  retryEmail: Joi.object({
    emailId: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      })
  }),

  getFailedEmails: Joi.object({
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
  })
};

// Generic validation middleware factory
const createValidator = (schema, property = 'body') => {
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

// Email validation middleware
const emailValidator = {
  validateSimulate: createValidator(emailSchemas.simulate),
  validateProcessManual: createValidator(emailSchemas.processManual),
  validateGetFailedEmails: createValidator(emailSchemas.getFailedEmails, 'query'),
  
  // Parameter validation
  validateEmailId: createValidator(
    Joi.object({
      emailId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
          'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
          'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID'),
          'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
        })
    }),
    'params'
  )
};

module.exports = emailValidator;
