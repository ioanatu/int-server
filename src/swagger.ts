import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SESSION_HEADER, SESSION_SECURITY_SCHEME, SWAGGER_PATH } from './common/constants';

/**
 * Builds the OpenAPI 3 document and mounts the Swagger UI at `/api-docs`.
 * The raw document is also served at `/api-docs-json` for client generation.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('IntegrityNext PoC API')
    .setDescription(
      [
        'Read-only REST API serving supplier master data for the IntegrityNext proof of concept.',
        '',
        '**Authentication** — every request to `/api/**` must carry an `X-SESSION` header whose',
        'value matches the `SESSION_TOKEN` configured on the server. Use the *Authorize* button',
        'above to set it for the requests you send from this page.',
        '',
        '**Data source** — this PoC has no database. Responses are served from two JSON fixtures',
        '(`suppliers.json` and `supplier.json`) that ship with the application.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .setContact('IntegrityNext PoC', 'https://github.com/', 'poc@example.com')
    .setLicense('UNLICENSED', '')
    .addServer('/', 'Current host')
    .addTag('Suppliers', 'Read access to supplier master data')
    .addTag('Health', 'Service liveness')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: SESSION_HEADER.toUpperCase(),
        description: 'Shared session token issued for this environment.',
      },
      SESSION_SECURITY_SCHEME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
    yamlDocumentUrl: `${SWAGGER_PATH}-yaml`,
    customSiteTitle: 'IntegrityNext PoC API — Reference',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
