export interface AppConfig {
  nodeEnv: string;
  port: number;
  sessionToken: string;
  swaggerEnabled: boolean;
  corsOrigins: string[] | boolean;
}

export const DEFAULT_DEV_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
export const DEFAULT_PROD_CORS_ORIGINS = ['https://int-next.ioanatatu.com'];

export const parseCorsOrigins = (raw: string | undefined, nodeEnv: string): string[] | boolean => {
  const configured: string[] = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.includes('*')) return true;
  if (configured.length > 0) return configured;

  return nodeEnv === 'production' ? DEFAULT_PROD_CORS_ORIGINS : DEFAULT_DEV_CORS_ORIGINS;
};

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    nodeEnv,
    port: parseInt(process.env.PORT ?? '3000', 10), // Render assigns the port at boot; never hard-code it
    sessionToken: process.env.SESSION_TOKEN ?? '',
    swaggerEnabled: (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() !== 'false',
    corsOrigins: parseCorsOrigins(process.env.FRONTEND_CORS_ORIGINS, nodeEnv),
  };
};
