import * as Joi from 'joi';

/**
 * Fails fast at boot when the runtime is misconfigured. `SESSION_TOKEN` is required
 * because every /api/** route is gated on it — starting without it would silently
 * expose (or fully block) the API depending on the guard implementation.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  SESSION_TOKEN: Joi.string().min(8).required(),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  CORS_ORIGINS: Joi.string().default('*'),
});
