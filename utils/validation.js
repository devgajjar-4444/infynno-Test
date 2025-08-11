const Joi = require('joi');
const { ROLES, TASK_STATUS, TASK_PRIORITY, VALIDATION } = require('../constants');
const { getMessage } = require('../messages');

// User validation schemas
const userValidation = {
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': getMessage('VALIDATION.NAME_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.NAME_TOO_LONG'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': getMessage('VALIDATION.INVALID_EMAIL'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),
    password: Joi.string()
      .min(8)
      .max(10)
      .pattern(
        new RegExp(
          '^(?=.*[a-z])' +        // at least one lowercase letter
          '(?=.*[A-Z])' +         // at least one uppercase letter
          '(?=.*\\d)' +           // at least one digit
          '(?=.*[!@#$%^&*()_+\\-={}\\[\\]|:;"\'<>,.?/])' + // at least one special character
          '.{8,10}$'
        )
      )
       .required()
      .messages({
        'string.min': getMessage('VALIDATION.PASSWORD_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.PASSWORD_TOO_LONG'),
        'string.pattern.base': getMessage('VALIDATION.INVALID_PASSWORD'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),
    role: Joi.number()
      .integer()
      .valid(ROLES.EMPLOYEE, ROLES.MANAGER)
      .default(ROLES.EMPLOYEE)
      .messages({
        'number.base': getMessage('VALIDATION.REQUIRED_FIELD'),
        'number.integer': getMessage('VALIDATION.REQUIRED_FIELD'),
        'any.only': getMessage('USER.INVALID_ROLE')
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': getMessage('VALIDATION.INVALID_EMAIL'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': getMessage('VALIDATION.NAME_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.NAME_TOO_LONG')
      }),
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': getMessage('VALIDATION.INVALID_EMAIL')
      })
  })
};

// Task validation schemas
const taskValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(5)
      .max(100)
      .required()
      .messages({
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    description: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description cannot exceed 1000 characters',
        'any.required': 'Description is required'
      }),
    assignedTo: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.hex': 'Assigned user ID must be a valid MongoDB ObjectId',
        'string.length': 'Assigned user ID must be 24 characters long',
        'any.required': 'Assigned user is required'
      }),
    priority: Joi.string()
      .valid(...Object.values(TASK_PRIORITY))
      .default(TASK_PRIORITY.MEDIUM)
      .messages({
        'any.only': `Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`
      }),
    dueDate: Joi.date()
      .greater('now')
      .required()
      .messages({
        'date.greater': 'Due date must be in the future',
        'any.required': 'Due date is required'
      }),
    estimatedHours: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': 'Estimated hours cannot be negative',
        'number.max': 'Estimated hours cannot exceed 1000'
      }),
    tags: Joi.array()
      .items(Joi.string().max(20))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'string.max': 'Each tag cannot exceed 20 characters'
      })
  }),

  update: Joi.object({
    title: Joi.string()
      .min(5)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 100 characters'
      }),
    description: Joi.string()
      .min(10)
      .max(1000)
      .optional()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description cannot exceed 1000 characters'
      }),
    status: Joi.string()
      .valid(...Object.values(TASK_STATUS))
      .optional()
      .messages({
        'any.only': `Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`
      }),
    priority: Joi.string()
      .valid(...Object.values(TASK_PRIORITY))
      .optional()
      .messages({
        'any.only': `Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`
      }),
    assignedTo: Joi.string()
      .hex()
      .length(24)
      .optional()
      .messages({
        'string.hex': 'Assigned user ID must be a valid MongoDB ObjectId',
        'string.length': 'Assigned user ID must be 24 characters long'
      }),
    dueDate: Joi.date()
      .greater('now')
      .optional()
      .messages({
        'date.greater': 'Due date must be in the future'
      }),
    estimatedHours: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': 'Estimated hours cannot be negative',
        'number.max': 'Estimated hours cannot exceed 1000'
      }),
    actualHours: Joi.number()
      .min(0)
      .max(1000)
      .optional()
      .messages({
        'number.min': 'Actual hours cannot be negative',
        'number.max': 'Actual hours cannot exceed 1000'
      }),
    tags: Joi.array()
      .items(Joi.string().max(20))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'string.max': 'Each tag cannot exceed 20 characters'
      })
  }),

  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    status: Joi.string()
      .valid(...Object.values(TASK_STATUS))
      .optional()
      .messages({
        'any.only': `Status must be one of: ${Object.values(TASK_STATUS).join(', ')}`
      }),
    priority: Joi.string()
      .valid(...Object.values(TASK_PRIORITY))
      .optional()
      .messages({
        'any.only': `Priority must be one of: ${Object.values(TASK_PRIORITY).join(', ')}`
      }),
    assignedTo: Joi.string()
      .hex()
      .length(24)
      .optional()
      .messages({
        'string.hex': 'Assigned user ID must be a valid MongoDB ObjectId',
        'string.length': 'Assigned user ID must be 24 characters long'
      }),
    createdBy: Joi.string()
      .hex()
      .length(24)
      .optional()
      .messages({
        'string.hex': 'Creator user ID must be a valid MongoDB ObjectId',
        'string.length': 'Creator user ID must be 24 characters long'
      }),
    dueDateFrom: Joi.date()
      .optional()
      .messages({
        'date.base': 'Due date from must be a valid date'
      }),
    dueDateTo: Joi.date()
      .optional()
      .messages({
        'date.base': 'Due date to must be a valid date'
      }),
    search: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Search term must be at least 2 characters long',
        'string.max': 'Search term cannot exceed 100 characters'
      }),
    sortBy: Joi.string()
      .valid('createdAt', 'dueDate', 'priority', 'status', 'title')
      .default('createdAt')
      .messages({
        'any.only': 'Sort by must be one of: createdAt, dueDate, priority, status, title'
      }),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
        'any.only': 'Sort order must be either asc or desc'
      })
  }),

  assign: Joi.object({
    assignedTo: Joi.string()
      .hex()
      .length(24)
      .required()
      .messages({
        'string.hex': 'Assigned user ID must be a valid MongoDB ObjectId',
        'string.length': 'Assigned user ID must be 24 characters long',
        'any.required': 'Assigned user is required'
      })
  }),

  comment: Joi.object({
    content: Joi.string()
      .min(1)
      .max(500)
      .required()
      .messages({
        'string.min': 'Comment cannot be empty',
        'string.max': 'Comment cannot exceed 500 characters',
        'any.required': 'Comment content is required'
      })
  })
};

// Report validation schemas
const reportValidation = {
  taskSummary: Joi.object({
    startDate: Joi.date()
      .optional()
      .messages({
        'date.base': 'Start date must be a valid date'
      }),
    endDate: Joi.date()
      .optional()
      .messages({
        'date.base': 'End date must be a valid date'
      }),
    groupBy: Joi.string()
      .valid('day', 'week', 'month')
      .default('month')
      .messages({
        'any.only': 'Group by must be one of: day, week, month'
      })
  })
};

// Email validation schemas
const emailValidation = {
  simulate: Joi.object({
    batchSize: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10)
      .messages({
        'number.integer': 'Batch size must be an integer',
        'number.min': 'Batch size must be at least 1',
        'number.max': 'Batch size cannot exceed 50'
      })
  })
};

// Export validation schemas
const exportValidation = {
  tasks: Joi.object({
    format: Joi.string()
      .valid('csv', 'json')
      .default('csv')
      .messages({
        'any.only': 'Format must be either csv or json'
      }),
    filters: Joi.object({
      status: Joi.string()
        .valid(...Object.values(TASK_STATUS))
        .optional(),
      priority: Joi.string()
        .valid(...Object.values(TASK_PRIORITY))
        .optional(),
      assignedTo: Joi.string()
        .hex()
        .length(24)
        .optional(),
      createdBy: Joi.string()
        .hex()
        .length(24)
        .optional(),
      dueDateFrom: Joi.date().optional(),
      dueDateTo: Joi.date().optional()
    }).optional()
  })
};

// Common validation schemas
const commonValidation = {
  objectId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'ID must be a valid MongoDB ObjectId',
      'string.length': 'ID must be 24 characters long',
      'any.required': 'ID is required'
    }),

  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
  })
};

module.exports = {
  userValidation,
  taskValidation,
  reportValidation,
  emailValidation,
  exportValidation,
  commonValidation
};
