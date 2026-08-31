/**
 * Runs before the module graph is imported, so `AppModule`'s config validation
 * sees a valid environment. Keeps `npm run test:e2e` free of shell prerequisites.
 */
process.env.NODE_ENV = 'test';
process.env.SESSION_TOKEN = 'e2e-test-session-token';
process.env.SWAGGER_ENABLED = 'true';
process.env.CORS_ORIGINS = '*';
