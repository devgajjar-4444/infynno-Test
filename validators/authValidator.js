const Joi = require('joi');
const { ROLES } = require('../constants');
const { getMessage } = require('../messages');
const { STATUS_CODES } = require('../constants');

// Auth validation schemas
const authSchemas = {
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
      .max(128)
      .pattern(
        new RegExp(
          '^(?=.*[a-z])' +        // at least one lowercase letter
          '(?=.*[A-Z])' +         // at least one uppercase letter
          '(?=.*\\d)' +           // at least one digit
          '(?=.*[!@#$%^&*()_+\\-={}\\[\\]|:;"\'<>,.?/])' + // at least one special character
          '.{8,}$'
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

  refreshToken: Joi.object({
    refreshToken: Joi.string()
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
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      }),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        new RegExp(
          '^(?=.*[a-z])' +        // at least one lowercase letter
          '(?=.*[A-Z])' +         // at least one uppercase letter
          '(?=.*\\d)' +           // at least one digit
          '(?=.*[!@#$%^&*()_+\\-={}\\[\\]|:;"\'<>,.?/])' + // at least one special character
          '.{8,}$'
        )
      )
      .required()
      .messages({
        'string.min': getMessage('VALIDATION.PASSWORD_TOO_SHORT'),
        'string.max': getMessage('VALIDATION.PASSWORD_TOO_LONG'),
        'string.pattern.base': getMessage('VALIDATION.INVALID_PASSWORD'),
        'any.required': getMessage('VALIDATION.REQUIRED_FIELD')
      })
  }),

  updateUserRole: Joi.object({
    role: Joi.number()
      .integer()
      .valid(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN)
      .required()
      .messages({
        'number.base': getMessage('VALIDATION.REQUIRED_FIELD'),
        'number.integer': getMessage('VALIDATION.REQUIRED_FIELD'),
        'any.only': getMessage('USER.INVALID_ROLE'),
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

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

// Auth validation middleware
const authValidator = {
  validateRegister: createValidator(authSchemas.register),
  validateLogin: createValidator(authSchemas.login),
  validateRefreshToken: createValidator(authSchemas.refreshToken),
  validateUpdateProfile: createValidator(authSchemas.updateProfile),
  validateChangePassword: createValidator(authSchemas.changePassword),
  validateUpdateUserRole: createValidator(authSchemas.updateUserRole),
  
  // Parameter validation
  validateUserId: createValidator(
    Joi.object({
      userId: Joi.string()
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

module.exports = authValidator;
