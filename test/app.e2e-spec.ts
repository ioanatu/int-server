import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { API_PREFIX } from '../src/common/constants';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { buildCorsOptions } from '../src/config/cors.options';
import { setupSwagger } from '../src/swagger';

// Kept in sync with test/setup-env.ts, which seeds the environment before AppModule loads.
const SESSION_TOKEN = process.env.SESSION_TOKEN as string;
const BASE = `/${API_PREFIX}/v1/suppliers`;
const INDUSTRIES = `/${API_PREFIX}/v1/industries`;
const COUNTRIES = `/${API_PREFIX}/v1/countries`;
const ALLOWED_ORIGIN = 'https://int-next.ioanatatu.com';

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
    app.enableCors(buildCorsOptions([ALLOWED_ORIGIN]));
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

    it('protects the countries endpoint as well', async () => {
      await request(server).get(COUNTRIES).expect(401);
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

    it('selects several countries with a repeated parameter', async () => {
      const response = await authed(`${BASE}?country=DE&country=FR&limit=100`).expect(200);

      expect(response.body.pagination.total).toBeGreaterThan(0);
      expect(
        response.body.data.every((s: { country: string }) => ['DE', 'FR'].includes(s.country)),
      ).toBe(true);
      expect(new Set(response.body.data.map((s: { country: string }) => s.country))).toEqual(
        new Set(['DE', 'FR']),
      );
    });

    it('selects several countries with a comma-separated list', async () => {
      const repeated = await authed(`${BASE}?country=DE&country=FR&limit=100`).expect(200);
      const csv = await authed(`${BASE}?country=DE,FR&limit=100`).expect(200);

      expect(csv.body).toEqual(repeated.body);
    });

    it('returns the union of the single-country result sets', async () => {
      const de = await authed(`${BASE}?country=DE&limit=1`).expect(200);
      const fr = await authed(`${BASE}?country=FR&limit=1`).expect(200);
      const both = await authed(`${BASE}?country=DE,FR&limit=1`).expect(200);

      expect(both.body.pagination.total).toBe(de.body.pagination.total + fr.body.pagination.total);
    });

    it('accepts a lower-cased multi-country selection', async () => {
      const lower = await authed(`${BASE}?country=de,fr&limit=100`).expect(200);
      const upper = await authed(`${BASE}?country=DE,FR&limit=100`).expect(200);

      expect(lower.body).toEqual(upper.body);
    });

    it('treats a repeated code as a single selection', async () => {
      const once = await authed(`${BASE}?country=DE&limit=100`).expect(200);
      const twice = await authed(`${BASE}?country=DE&country=de&limit=100`).expect(200);

      expect(twice.body).toEqual(once.body);
    });

    it('combines a multi-country selection with the other filters', async () => {
      const response = await authed(`${BASE}?country=DE,FR&status=active&limit=100`).expect(200);

      expect(response.body.pagination.total).toBeGreaterThan(0);
      expect(
        response.body.data.every(
          (s: { country: string; status: string }) =>
            ['DE', 'FR'].includes(s.country) && s.status === 'active',
        ),
      ).toBe(true);
    });

    it('paginates a multi-country result set', async () => {
      const all = await authed(`${BASE}?country=DE,FR&limit=100`).expect(200);
      const page = await authed(`${BASE}?country=DE,FR&page=1&limit=2`).expect(200);

      expect(all.body.pagination.total).toBeGreaterThan(2);
      expect(page.body.data).toHaveLength(2);
      expect(page.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: all.body.pagination.total,
        hasNext: true,
      });
      expect(page.body.data).toEqual(all.body.data.slice(0, 2));
    });

    it('returns an empty page when no selected country exists', async () => {
      const response = await authed(`${BASE}?country=ZZ,XX&limit=100`).expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it.each([
      ['status', `${BASE}?status=bogus`],
      ['riskLevel', `${BASE}?riskLevel=extreme`],
      ['country', `${BASE}?country=DEU`],
      ['country', `${BASE}?country=DE,DEU`],
      ['country', `${BASE}?country=DE&country=DEU`],
      ['country', `${BASE}?country=`],
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

  describe(`GET ${COUNTRIES}`, () => {
    it('returns every country with an ISO code id and a supplier count', async () => {
      const response = await authed(COUNTRIES).expect(200);

      expect(Object.keys(response.body).sort()).toEqual(['data', 'total']);
      expect(response.body.total).toBe(response.body.data.length);
      expect(response.body.total).toBeGreaterThan(0);

      for (const country of response.body.data) {
        expect(country).toEqual({
          id: expect.stringMatching(/^[A-Z]{2}$/),
          name: expect.any(String),
          supplierCount: expect.any(Number),
        });
        expect(country.supplierCount).toBeGreaterThan(0);
      }
    });

    it('sorts countries by name', async () => {
      const names = (await authed(COUNTRIES).expect(200)).body.data.map(
        (c: { name: string }) => c.name,
      );

      expect(names).toEqual([...names].sort((a: string, b: string) => a.localeCompare(b)));
    });

    it('counts sum to the full supplier total', async () => {
      const countries = await authed(COUNTRIES).expect(200);
      const suppliers = await authed(`${BASE}?limit=1`).expect(200);

      const sum = countries.body.data.reduce(
        (acc: number, c: { supplierCount: number }) => acc + c.supplierCount,
        0,
      );
      expect(sum).toBe(suppliers.body.pagination.total);
    });

    it('advertises ids that each filter the supplier list to the advertised count', async () => {
      const countries = await authed(COUNTRIES).expect(200);

      // The contract that makes this endpoint useful: every id it hands the frontend
      // must work verbatim as a `country` filter value.
      for (const country of countries.body.data as { id: string; supplierCount: number }[]) {
        const filtered = await authed(`${BASE}?country=${country.id}&limit=100`).expect(200);
        expect(filtered.body.pagination.total).toBe(country.supplierCount);
        expect(filtered.body.data).toHaveLength(country.supplierCount);
      }
    });

    it('selecting every advertised id returns the whole supplier list', async () => {
      const countries = await authed(COUNTRIES).expect(200);
      const ids = (countries.body.data as { id: string }[]).map((c) => c.id).join(',');

      const filtered = await authed(`${BASE}?country=${ids}&limit=100`).expect(200);
      const unfiltered = await authed(`${BASE}?limit=100`).expect(200);

      expect(filtered.body).toEqual(unfiltered.body);
    });

    it('rejects unknown query parameters', async () => {
      await authed(`${COUNTRIES}?page=1`).expect(400);
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
        expect.arrayContaining([`${BASE}`, `${BASE}/{supplierId}`, INDUSTRIES, COUNTRIES]),
      );
      expect(response.body.paths[INDUSTRIES].get.security).toEqual([{ 'X-SESSION': [] }]);
      expect(response.body.paths[COUNTRIES].get.security).toEqual([{ 'X-SESSION': [] }]);
      expect(response.body.components.schemas).toHaveProperty('IndustryListDto');
      expect(response.body.components.schemas).toHaveProperty('IndustryDto');
      expect(response.body.components.schemas).toHaveProperty('CountryOptionListDto');
      expect(response.body.components.schemas).toHaveProperty('CountryOptionDto');
      expect(response.body.components.securitySchemes).toHaveProperty('X-SESSION');
      expect(response.body.components.securitySchemes['X-SESSION']).toMatchObject({
        type: 'apiKey',
        in: 'header',
        name: 'X-SESSION',
      });
      expect(response.body.paths[BASE].get.security).toEqual([{ 'X-SESSION': [] }]);
    });

    it('keeps the country filter schema distinct from the nested address country', async () => {
      const response = await request(server).get('/api-docs-json').expect(200);

      // Nest keys components.schemas by class name, so a reference-data DTO called
      // CountryDto would silently overwrite the {code, name} object nested in a
      // supplier's address — and generated clients would get the wrong shape for one
      // of them with no error anywhere.
      const schemas = response.body.components.schemas;

      expect(Object.keys(schemas.CountryDto.properties).sort()).toEqual(['code', 'name']);
      expect(Object.keys(schemas.CountryOptionDto.properties).sort()).toEqual([
        'id',
        'name',
        'supplierCount',
      ]);
      expect(schemas.CountryOptionListDto.properties.data.items.$ref).toBe(
        '#/components/schemas/CountryOptionDto',
      );
      expect(schemas.SupplierAddressDto.properties.country.$ref).toBe(
        '#/components/schemas/CountryDto',
      );
    });

    it('documents the country filter as a repeatable array parameter', async () => {
      const response = await request(server).get('/api-docs-json').expect(200);

      const params = response.body.paths[BASE].get.parameters as {
        name: string;
        in: string;
        required: boolean;
        schema: Record<string, unknown>;
      }[];
      const country = params.find((p) => p.name === 'country');

      expect(country).toBeDefined();
      expect(country!.in).toBe('query');
      expect(country!.required).toBe(false);
      expect(country!.schema).toMatchObject({ type: 'array', items: { type: 'string' } });
    });

    it('tags the countries endpoint as reference data', async () => {
      const response = await request(server).get('/api-docs-json').expect(200);

      expect(response.body.paths[COUNTRIES].get.tags).toEqual(['Countries']);
      expect(response.body.tags.map((t: { name: string }) => t.name)).toEqual(
        expect.arrayContaining(['Countries']),
      );
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

  describe('CORS', () => {
    it('answers the preflight for an allowed origin with the session header', async () => {
      const response = await request(server)
        .options(BASE)
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'x-session')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
      expect(response.headers['access-control-allow-headers']).toMatch(/X-SESSION/i);
      expect(response.headers['access-control-allow-methods']).toMatch(/GET/);
      // No cookies are involved; the browser must not be told to send credentials.
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('does not reach the session guard on a preflight', async () => {
      // A 401 here would mean the guard rejects the credential-less OPTIONS request and the
      // browser never gets to send the real one.
      await request(server)
        .options(BASE)
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
    });

    it('omits the allow-origin header for a disallowed origin', async () => {
      const response = await request(server)
        .get(BASE)
        .set('Origin', 'https://evil.example')
        .set('X-SESSION', SESSION_TOKEN)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('echoes the allow-origin header on an allowed cross-origin GET', async () => {
      const response = await request(server)
        .get(BASE)
        .set('Origin', ALLOWED_ORIGIN)
        .set('X-SESSION', SESSION_TOKEN)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });

    it('keeps CORS headers on error responses so the browser can read the status', async () => {
      const response = await request(server).get(BASE).set('Origin', ALLOWED_ORIGIN).expect(401);

      expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });
  });
});
