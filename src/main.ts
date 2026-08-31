import 'reflect-metadata';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_PREFIX, SESSION_SECURITY_SCHEME, SWAGGER_PATH } from './common/constants';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // /api/v1/... — the version lives in the URL so future breaking changes can coexist.
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.use(
    helmet({
      // The Swagger UI loads inline styles/scripts; CSP is relaxed only for that page.
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: configService.get('corsOrigins'),
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', SESSION_SECURITY_SCHEME],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (configService.get<boolean>('swaggerEnabled')) {
    setupSwagger(app);
  }

  const port = configService.get<number>('port') ?? 3000;
  // 0.0.0.0 is required for the app to be reachable inside a Heroku dyno.
  await app.listen(port, '0.0.0.0');

  logger.log(`API listening on port ${port}`);
  logger.log(`Base path: /${API_PREFIX}/v1`);
  if (configService.get<boolean>('swaggerEnabled')) {
    logger.log(`Swagger UI: /${SWAGGER_PATH}`);
  }
}

void bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap', error);
  process.exit(1);
});
