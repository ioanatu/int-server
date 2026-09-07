import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  SESSION_TOKEN: Joi.string().min(10).required(),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  FRONTEND_CORS_ORIGINS: Joi.string().allow('').optional(),
});
