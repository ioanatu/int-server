import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { SESSION_SECURITY_SCHEME } from '../common/constants';

export const buildCorsOptions = (origin: string[] | boolean): CorsOptions => ({
  origin,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', SESSION_SECURITY_SCHEME],
  credentials: false,
  maxAge: 86_400, // cache the preflight
});
