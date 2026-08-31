export interface AppConfig {
  nodeEnv: string;
  port: number;
  sessionToken: string;
  swaggerEnabled: boolean;
  corsOrigins: string[] | boolean;
}

const parseCorsOrigins = (raw: string | undefined): string[] | boolean => {
  if (!raw || raw.trim() === '*') {
    return true;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Heroku assigns the port at boot; never hard-code it.
  port: parseInt(process.env.PORT ?? '3000', 10),
  sessionToken: process.env.SESSION_TOKEN ?? '',
  swaggerEnabled: (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() !== 'false',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
});
