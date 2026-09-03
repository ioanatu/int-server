import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { API_PREFIX } from '../src/common/constants';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { setupSwagger } from '../src/swagger';

// Kept in sync with test/setup-env.ts, which seeds the environment before AppModule loads.
const SESSION_TOKEN = process.env.SESSION_TOKEN as string;
const BASE = `/${API_PREFIX}/v1/suppliers`;
const INDUSTRIES = `/${API_PREFIX}/v1/industries`;

describe('IntNext PoC API (e2e)', () => {
  let app: INestApplication;
  // Bound once and shared. Passing an unbound server to supertest makes it bind a
  // fresh ephemeral port per request, which is slow and occasionally races when a
  // test issues dozens of calls in a row.
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    // Mirrors the middleware stack configured in src/main.ts.
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    setupSwagger(app);

    await app.init();

    server = app.getHttpServer() as Server;
    await new Promise<void>((resolve) => server.listen(0, resolve));
  });

  afterAll(async () => {
    await app.close();
  });

  const authed = (path: string) => request(server).get(path).set('X-SESSION', SESSION_TOKEN);

  describe('authentication', () => {
    it('rejects a request without the X-SESSION header', async () => {
      const response = await request(server).get(BASE).expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Missing X-SESSION header.',
        path: BASE,
      });
      expect(response.body.timestamp).toEqual(expect.any(String));
    });

    it('rejects a request with a wrong token', async () => {
      await request(server).get(BASE).set('X-SESSION', 'wrong').expect(401);
    });

    it('accepts a lower-cased header name (HTTP headers are case-insensitive)', async () => {
      await request(server).get(BASE).set('x-session', SESSION_TOKEN).expect(200);
    });

    it('protects the detail endpoint as well', async () => {
      await request(server).get(`${BASE}/sup_001`).expect(401);
    });

    it('protects the industries endpoint as well', async () => {
      await request(server).get(INDUSTRIES).expect(401);
    });

    it('leaves the health endpoint public', async () => {
      const response = await request(server).get('/health').expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe(`GET ${BASE}`, () => {
    it('returns the documented envelope', async () => {
      const response = await authed(BASE).expect(200);

      expect(Object.keys(response.body).sort()).toEqual(['data', 'pagination']);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        hasNext: true,
      });
      expect(response.body.data[0]).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        country: expect.any(String),
        status: expect.any(String),
        risk: { level: expect.any(String), score: expect.any(Number) },
      });
    });

    it('applies the combined search + filter + paging example from the requirements', async () => {
      const response = await authed(
        `${BASE}?search=example&country=DE&status=active&riskLevel=high&page=1&limit=10`,
      ).expect(200);

      expect(response.body.data).toEqual([
        {
          id: 'sup_001',
          name: 'Example Supplier GmbH',
          country: 'DE',
          status: 'active',
          risk: { level: 'high', score: 82 },
        },
      ]);
      expect(response.body.pagination).toEqual({ page: 1, limit: 10, total: 1, hasNext: false });
    });

    it('honours page and limit', async () => {
      const response = await authed(`${BASE}?page=2&limit=5`).expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination).toMatchObject({ page: 2, limit: 5, hasNext: true });
    });

    it('accepts a lower-cased country code', async () => {
      const response = await authed(`${BASE}?country=de&limit=100`).expect(200);

      expect(response.body.pagination.total).toBeGreaterThan(0);
      expect(response.body.data.every((s: { country: string }) => s.country === 'DE')).toBe(true);
    });

    it.each([
      ['status', `${BASE}?status=bogus`],
      ['riskLevel', `${BASE}?riskLevel=extreme`],
      ['country', `${BASE}?country=DEU`],
      ['page', `${BASE}?page=0`],
      ['page', `${BASE}?page=abc`],
      ['limit', `${BASE}?limit=1000`],
    ])('rejects an invalid %s with 400', async (_field, url) => {
      const response = await authed(url).expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('rejects unknown query parameters', async () => {
      await authed(`${BASE}?unexpected=1`).expect(400);
    });
  });

  describe(`GET ${BASE}/{supplierId}`, () => {
    it('returns the full supplier profile', async () => {
      const response = await authed(`${BASE}/sup_001`).expect(200);

      expect(response.body).toMatchObject({
        id: 'sup_001',
        identity: {
          name: 'Example Supplier GmbH',
          legalName: 'Example Supplier GmbH',
          identifiers: { vatNumber: 'DE123456789', duns: '123456789' },
        },
        address: { city: 'Munich', postalCode: '80331', country: { code: 'DE', name: 'Germany' } },
        company: { industry: 'Manufacturing', employeeCount: 250, foundedYear: 1998 },
        relationship: { status: 'active', tier: 1, since: '2024-01-01' },
        risk: { score: 82, level: 'high' },
        assessment: { status: 'completed', score: 84 },
        documents: { total: 12, valid: 10, expiringSoon: 2, expired: 0 },
      });
    });

    it('returns 404 for an unknown supplier', async () => {
      const response = await authed(`${BASE}/sup_999`).expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: "Supplier with id 'sup_999' was not found.",
      });
    });

    it('is reachable for every id returned by the list endpoint', async () => {
      const list = await authed(`${BASE}?limit=100`).expect(200);

      expect(list.body.data).toHaveLength(50);

      // Sequential on purpose: each supertest call binds its own ephemeral port.
      for (const supplier of list.body.data as { id: string }[]) {
        await authed(`${BASE}/${supplier.id}`).expect(200);
      }
    });
  });

  describe(`GET ${INDUSTRIES}`, () => {
    it('returns every industry with a URL-safe id and a supplier count', async () => {
      const response = await authed(INDUSTRIES).expect(200);

      expect(Object.keys(response.body).sort()).toEqual(['data', 'total']);
      expect(response.body.total).toBe(response.body.data.length);
      expect(response.body.total).toBeGreaterThan(0);

      for (const industry of response.body.data) {
        expect(industry).toEqual({
          id: expect.stringMatching(/^[a-z0-9]+(-[a-z0-9]+)*$/),
          name: expect.any(String),
          supplierCount: expect.any(Number),
        });
        expect(industry.supplierCount).toBeGreaterThan(0);
      }
    });

    it('sorts industries by name', async () => {
      const names = (await authed(INDUSTRIES).expect(200)).body.data.map(
        (i: { name: string }) => i.name,
      );

      expect(names).toEqual([...names].sort((a: string, b: string) => a.localeCompare(b)));
    });

    it('counts sum to the full supplier total', async () => {
      const industries = await authed(INDUSTRIES).expect(200);
      const suppliers = await authed(`${BASE}?limit=1`).expect(200);

      const sum = industries.body.data.reduce(
        (acc: number, i: { supplierCount: number }) => acc + i.supplierCount,
        0,
      );
      expect(sum).toBe(suppliers.body.pagination.total);
    });

    it('advertises ids that each filter the supplier list to the advertised count', async () => {
      const industries = await authed(INDUSTRIES).expect(200);

      // The contract that makes this endpoint useful: every id it hands the frontend
      // must work verbatim as an `industry` filter value, with no encoding.
      for (const industry of industries.body.data as { id: string; supplierCount: number }[]) {
        const filtered = await authed(`${BASE}?industry=${industry.id}&limit=100`).expect(200);
        expect(filtered.body.pagination.total).toBe(industry.supplierCount);
        expect(filtered.body.data).toHaveLength(industry.supplierCount);
      }
    });

    it('rejects unknown query parameters', async () => {
      await authed(`${INDUSTRIES}?page=1`).expect(400);
    });
  });

  describe('OpenAPI', () => {
    it('serves the Swagger UI', async () => {
      const response = await request(server).get('/api-docs').expect(200);

      expect(response.text).toContain('swagger');
    });

    it('serves a valid OpenAPI document describing both endpoints', async () => {
      const response = await request(server).get('/api-docs-json').expect(200);

      expect(response.body.openapi).toMatch(/^3\./);
      expect(response.body.info.title).toBe('IntNext PoC API');
      expect(Object.keys(response.body.paths)).toEqual(
        expect.arrayContaining([`${BASE}`, `${BASE}/{supplierId}`, INDUSTRIES]),
      );
      expect(response.body.paths[INDUSTRIES].get.security).toEqual([{ 'X-SESSION': [] }]);
      expect(response.body.components.schemas).toHaveProperty('IndustryListDto');
      expect(response.body.components.schemas).toHaveProperty('IndustryDto');
      expect(response.body.components.securitySchemes).toHaveProperty('X-SESSION');
      expect(response.body.components.securitySchemes['X-SESSION']).toMatchObject({
        type: 'apiKey',
        in: 'header',
        name: 'X-SESSION',
      });
      expect(response.body.paths[BASE].get.security).toEqual([{ 'X-SESSION': [] }]);
    });

    it('types nullable properties concretely, so generated clients stay accurate', async () => {
      const response = await request(server).get('/api-docs-json').expect(200);

      const assessment = response.body.components.schemas.SupplierAssessmentDto.properties;

      // A `T | null` union has no usable design:type, so these degrade to
      // `type: 'object'` unless @ApiProperty declares the type explicitly.
      expect(assessment.score).toMatchObject({ type: 'number', nullable: true });
      expect(assessment.lastCompletedAt).toMatchObject({ type: 'string', nullable: true });
      expect(assessment.expiresAt).toMatchObject({ type: 'string', nullable: true });
    });

    it('leaves no schema property weakly typed as a bare object', async () => {
      const response = await request(server).get('/api-docs-json').expect(200);

      type Schema = { properties?: Record<string, Record<string, unknown>> };

      const weak: string[] = [];
      for (const [name, schema] of Object.entries<Schema>(response.body.components.schemas)) {
        for (const [prop, value] of Object.entries(schema.properties ?? {})) {
          const isBareObject =
            value.type === 'object' &&
            !value.properties &&
            !value.$ref &&
            !value.additionalProperties;
          if (isBareObject) {
            weak.push(`${name}.${prop}`);
          }
        }
      }

      expect(weak).toEqual([]);
    });
  });
});
