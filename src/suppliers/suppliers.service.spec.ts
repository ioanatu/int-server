import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { SuppliersRepository } from './suppliers.repository';
import { SuppliersService } from './suppliers.service';

/** Builds a query DTO with the same defaults the ValidationPipe would apply. */
const query = (overrides: Partial<ListSuppliersQueryDto> = {}): ListSuppliersQueryDto =>
  Object.assign(new ListSuppliersQueryDto(), overrides);

describe('SuppliersService', () => {
  let service: SuppliersService;
  let repository: SuppliersRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SuppliersService, SuppliersRepository],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(SuppliersService);
    repository = moduleRef.get(SuppliersRepository);
  });

  describe('findAll', () => {
    it('returns the first page with default paging', () => {
      const result = service.findAll(query());

      expect(result.data).toHaveLength(10);
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 50, hasNext: true });
    });

    it('projects each item onto the flat list contract', () => {
      const [first] = service.findAll(query({ limit: 1 })).data;

      expect(first).toEqual({
        id: 'sup_001',
        name: 'Example Supplier GmbH',
        country: 'DE',
        status: 'active',
        risk: { level: 'high', score: 82 },
      });
    });

    it('reports hasNext=false on the last page', () => {
      const result = service.findAll(query({ page: 5, limit: 10 }));

      expect(result.data).toHaveLength(10);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('returns an empty page past the end of the result set', () => {
      const result = service.findAll(query({ page: 99 }));

      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({ page: 99, limit: 10, total: 50, hasNext: false });
    });

    it('paginates without overlap or gaps', () => {
      const firstPage = service.findAll(query({ page: 1, limit: 7 })).data.map((s) => s.id);
      const secondPage = service.findAll(query({ page: 2, limit: 7 })).data.map((s) => s.id);

      expect(firstPage).toHaveLength(7);
      expect(secondPage).toHaveLength(7);
      expect(firstPage.filter((id) => secondPage.includes(id))).toEqual([]);
    });

    it('searches case-insensitively across name, industry and country', () => {
      const byName = service.findAll(query({ search: 'example' }));
      expect(byName.pagination.total).toBeGreaterThanOrEqual(1);
      expect(byName.data[0].id).toBe('sup_001');

      const byCountryName = service.findAll(query({ search: 'GERMANY' }));
      expect(byCountryName.pagination.total).toBeGreaterThan(0);
      expect(byCountryName.data.every((supplier) => supplier.country === 'DE')).toBe(true);
    });

    it('finds a supplier by its id through search', () => {
      const result = service.findAll(query({ search: 'sup_002' }));

      expect(result.pagination.total).toBe(1);
      expect(result.data[0].id).toBe('sup_002');
    });

    it('returns an empty result set when nothing matches', () => {
      const result = service.findAll(query({ search: 'no-such-supplier-anywhere' }));

      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 0, hasNext: false });
    });

    it.each([
      ['country', { country: ['DE'] }, (s: { country: string }) => s.country === 'DE'],
      ['status', { status: 'active' } as const, (s: { status: string }) => s.status === 'active'],
      [
        'riskLevel',
        { riskLevel: 'high' } as const,
        (s: { risk: { level: string } }) => s.risk.level === 'high',
      ],
    ])('filters by %s', (_label, filter, predicate) => {
      const result = service.findAll(query({ ...filter, limit: 100 }));

      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.data.every(predicate)).toBe(true);
    });

    it('combines every filter with AND', () => {
      const result = service.findAll(
        query({
          search: 'example',
          country: ['DE'],
          status: 'active',
          riskLevel: 'high',
          limit: 100,
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('sup_001');
      expect(result.pagination.total).toBe(1);
    });

    it('yields no results when filters contradict each other', () => {
      const result = service.findAll(
        query({ country: ['DE'], riskLevel: 'high', status: 'offboarded', search: 'example' }),
      );

      expect(result.pagination.total).toBe(0);
    });

    it('counts the full match set, not just the returned page', () => {
      const all = service.findAll(query({ country: ['DE'], limit: 100 }));
      const firstPage = service.findAll(query({ country: ['DE'], limit: 1 }));

      expect(firstPage.pagination.total).toBe(all.pagination.total);
      expect(firstPage.data).toHaveLength(1);
    });

    it('filters by several countries at once, OR-ing them together', () => {
      const summaries = repository.findAllSummaries();
      const expected = summaries.filter((s) => ['DE', 'FR'].includes(s.country.code)).length;

      const result = service.findAll(query({ country: ['DE', 'FR'], limit: 100 }));

      expect(expected).toBeGreaterThan(0);
      expect(result.pagination.total).toBe(expected);
      expect(result.data.every((s) => ['DE', 'FR'].includes(s.country))).toBe(true);
      expect(new Set(result.data.map((s) => s.country))).toEqual(new Set(['DE', 'FR']));
    });

    it('returns the union of the single-country result sets', () => {
      const de = service.findAll(query({ country: ['DE'], limit: 100 })).pagination.total;
      const fr = service.findAll(query({ country: ['FR'], limit: 100 })).pagination.total;
      const both = service.findAll(query({ country: ['DE', 'FR'], limit: 100 })).pagination.total;

      expect(both).toBe(de + fr);
    });

    it('ignores an unknown code among known ones', () => {
      const known = service.findAll(query({ country: ['DE'], limit: 100 }));
      const withUnknown = service.findAll(query({ country: ['DE', 'ZZ'], limit: 100 }));

      expect(withUnknown.data).toEqual(known.data);
    });

    it('returns an empty page when no selected country exists', () => {
      const result = service.findAll(query({ country: ['ZZ', 'XX'], limit: 100 }));

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('treats a repeated country code as a single selection', () => {
      const once = service.findAll(query({ country: ['DE'], limit: 100 }));
      const twice = service.findAll(query({ country: ['DE', 'DE'], limit: 100 }));

      expect(twice.pagination.total).toBe(once.pagination.total);
      expect(twice.data).toEqual(once.data);
    });

    it('applies no country filter when the list is empty', () => {
      const filtered = service.findAll(query({ country: [], limit: 100 }));
      const unfiltered = service.findAll(query({ limit: 100 }));

      expect(filtered.pagination.total).toBe(unfiltered.pagination.total);
    });

    it('combines a multi-country selection with the other filters', () => {
      const result = service.findAll(
        query({ country: ['DE', 'FR'], status: 'active', limit: 100 }),
      );

      expect(result.data.every((s) => ['DE', 'FR'].includes(s.country))).toBe(true);
      expect(result.data.every((s) => s.status === 'active')).toBe(true);
      expect(result.pagination.total).toBe(
        repository
          .findAllSummaries()
          .filter(
            (s) => ['DE', 'FR'].includes(s.country.code) && s.relationship.status === 'active',
          ).length,
      );
    });

    it('paginates a multi-country result set', () => {
      const all = service.findAll(query({ country: ['DE', 'FR'], limit: 100 }));
      const firstPage = service.findAll(query({ country: ['DE', 'FR'], page: 1, limit: 2 }));

      expect(all.pagination.total).toBeGreaterThan(2);
      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.pagination.total).toBe(all.pagination.total);
      expect(firstPage.pagination.hasNext).toBe(true);
      expect(firstPage.data).toEqual(all.data.slice(0, 2));
    });

    it('filters by industry case-insensitively', () => {
      const result = service.findAll(query({ industry: 'mAnUfAcTuRiNg', limit: 100 }));

      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.pagination.total).toBe(
        repository.findAllSummaries().filter((s) => s.industry === 'Manufacturing').length,
      );
    });

    it('accepts the industry id served by GET /api/v1/industries', () => {
      const byId = service.findAll(query({ industry: 'manufacturing', limit: 100 }));
      const byName = service.findAll(query({ industry: 'Manufacturing', limit: 100 }));

      expect(byId.pagination.total).toBeGreaterThan(0);
      expect(byId.data).toEqual(byName.data);
    });

    it('matches an industry whose name needs URL encoding, by id or by name', () => {
      const expected = repository
        .findAllSummaries()
        .filter((s) => s.industry === 'Food & Beverage').length;

      expect(expected).toBeGreaterThan(0);
      // The id is the point of this test: "food-beverage" needs no percent-encoding.
      expect(
        service.findAll(query({ industry: 'food-beverage', limit: 100 })).pagination.total,
      ).toBe(expected);
      expect(
        service.findAll(query({ industry: 'Food & Beverage', limit: 100 })).pagination.total,
      ).toBe(expected);
    });

    it('returns an empty page for an unknown industry', () => {
      const result = service.findAll(query({ industry: 'no-such-industry' }));

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('combines the industry filter with the other filters', () => {
      const combined = service.findAll(
        query({ industry: 'manufacturing', status: 'active', limit: 100 }),
      );

      expect(combined.data.every((s) => s.status === 'active')).toBe(true);
      for (const item of combined.data) {
        expect(repository.findDetailById(item.id)!.company.industry).toBe('Manufacturing');
      }
    });
  });

  describe('findOne', () => {
    it('returns the full detail record', () => {
      const supplier = service.findOne('sup_001');

      expect(supplier.id).toBe('sup_001');
      expect(supplier.identity.name).toBe('Example Supplier GmbH');
      expect(supplier.identity.identifiers.vatNumber).toBe('DE123456789');
      expect(supplier.address.city).toBe('Munich');
      expect(supplier.relationship.procurement.annualSpend).toEqual({
        amount: 1250000,
        currency: 'EUR',
      });
      expect(supplier.documents).toEqual({ total: 12, valid: 10, expiringSoon: 2, expired: 0 });
    });

    it('throws NotFoundException for an unknown id', () => {
      expect(() => service.findOne('sup_missing')).toThrow(NotFoundException);
      expect(() => service.findOne('sup_missing')).toThrow(
        "Supplier with id 'sup_missing' was not found.",
      );
    });
  });
});
