const Joi = require('joi');
const { TASK_STATUS, TASK_PRIORITY } = require('../constants');
const { getMessage } = require('../messages');
const { STATUS_CODES } = require('../constants');

// Task validation schemas
const taskSchemas = {
  create: Joi.object({
    title: Joi.string()
      .min(5)
      .max(100)
      .required()
      .messages({
        'string.min': getMessage('VALIDATION.TITLE_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.TITLE_TOO_LONG'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),

    description: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': getMessage('VALIDATION.DESCRIPTION_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.DESCRIPTION_TOO_LONG'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),

    // assignedTo: Joi.string()
    //   .hex()
    //   .length(24)
    //   .required()
    //   .messages({
    //     'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
    //     'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID'),
    //     'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
    //   }),

    priority: Joi.string()
      .valid(...Object.values(TASK_PRIORITY))
      .default(TASK_PRIORITY.MEDIUM)
      .messages({
        'any.only': getMessage('TASK.INVALID_PRIORITY')
      }),

    dueDate: Joi.date()
      .greater('now')
      .required()
      .messages({
        'date.greater': getMessage('TASK.INVALID_DUE_DATE'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),

    estimatedHours: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': getMessage('TASK.INVALID_ESTIMATED_HOURS'),
        'number.max': getMessage('TASK.INVALID_ESTIMATED_HOURS')
      }),

    tags: Joi.alternatives()
      .try(
        Joi.string()
          .custom((value, helpers) => {
            const arr = value.split(',').map(tag => tag.trim());
            if (arr.length > 10) {
              return helpers.error('array.max');
            }
            if (arr.some(tag => tag.length > 20)) {
              return helpers.error('string.max');
            }
            return arr;
          }),
        Joi.array().items(Joi.string().max(20)).max(10)
      )
      .optional()
      .messages({
        'array.max': getMessage('TASK.MAX_TAGS_EXCEEDED'),
        'string.max': getMessage('TASK.TAG_TOO_LONG')
      })
  }),

  update: Joi.object({
    title: Joi.string()
      .min(5)
      .max(100)
      .optional()
      .messages({
        'string.min': getMessage('VALIDATION.TITLE_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.TITLE_TOO_LONG')
      }),

    description: Joi.string()
      .min(10)
      .max(1000)
      .optional()
      .messages({
        'string.min': getMessage('VALIDATION.DESCRIPTION_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.DESCRIPTION_TOO_LONG')
      }),

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

    dueDate: Joi.date()
      .greater('now')
      .optional()
      .messages({
        'date.greater': getMessage('TASK.INVALID_DUE_DATE')
      }),

    estimatedHours: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': getMessage('TASK.INVALID_ESTIMATED_HOURS'),
        'number.max': getMessage('TASK.INVALID_ESTIMATED_HOURS')
      }),

    actualHours: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': getMessage('TASK.INVALID_ACTUAL_HOURS'),
        'number.max': getMessage('TASK.INVALID_ACTUAL_HOURS')
      }),

    tags: Joi.alternatives()
      .try(
        Joi.string()
          .custom((value, helpers) => {
            const arr = value.split(',').map(tag => tag.trim());
            if (arr.length > 10) {
              return helpers.error('array.max');
            }
            if (arr.some(tag => tag.length > 20)) {
              return helpers.error('string.max');
            }
            return arr;
          }),
        Joi.array().items(Joi.string().max(20)).max(10)
      )
      .optional()
      .messages({
        'array.max': getMessage('TASK.MAX_TAGS_EXCEEDED'),
        'string.max': getMessage('TASK.TAG_TOO_LONG')
      })
  }),

  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.integer': getMessage('VALIDATION.INVALID_PAGE_NUMBER'),
        'number.min': getMessage('VALIDATION.INVALID_PAGE_NUMBER')
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
      }),
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
      }),
    search: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': getMessage('VALIDATION.INVALID_SEARCH_TERM'),
        'string.max': getMessage('VALIDATION.INVALID_SEARCH_TERM')
      }),
    sortBy: Joi.string()
      .valid('createdAt', 'dueDate', 'priority', 'status', 'title')
      .default('createdAt')
      .messages({
        'any.only': getMessage('VALIDATION.INVALID_SORT_FIELD')
      }),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
        'any.only': getMessage('VALIDATION.INVALID_SORT_ORDER')
      })
  }),

  assign: Joi.object({
    assignedTo: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.hex': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'string.length': getMessage('VALIDATION.INVALID_OBJECT_ID'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      })
  }),

  comment: Joi.object({
    content: Joi.string()
      .min(1)
      .max(500)
      .required()
      .messages({
        'string.min': getMessage('VALIDATION.REQUIRED_FIELD'),
        'string.max': getMessage('TASK.COMMENT_TOO_LONG'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
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

    req[property] = value;
    next();
  };
};

// Task validation middleware
const taskValidator = {
  validateCreate: createValidator(taskSchemas.create),
  validateUpdate: createValidator(taskSchemas.update),
  validateQuery: createValidator(taskSchemas.query, 'query'),
  validateAssign: createValidator(taskSchemas.assign),
  validateComment: createValidator(taskSchemas.comment),

  validateTaskId: createValidator(
    Joi.object({
      id: Joi.string()
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
  ),

  validateAttachmentId: createValidator(
    Joi.object({
      attachmentId: Joi.string()
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

module.exports = taskValidator;
