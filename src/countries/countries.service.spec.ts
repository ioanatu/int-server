import { Test } from '@nestjs/testing';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
import { CountriesService } from './countries.service';
import { describe, it, before } from 'node:test';

describe('CountriesService', () => {
  let service: CountriesService;
  let repository: SuppliersRepository;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CountriesService, SuppliersRepository],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(CountriesService);
    repository = moduleRef.get(SuppliersRepository);
  });

  it('returns every distinct country in the supplier data', () => {
    const expected = new Set(repository.findAllSummaries().map((s) => s.country.code));
    const result = service.findAll();

    expect(result.total).toBe(expected.size);
    expect(result.data).toHaveLength(expected.size);
    expect(new Set(result.data.map((c) => c.id))).toEqual(expected);
  });

  it('reports a count per country that sums to the supplier total', () => {
    const result = service.findAll();
    const sum = result.data.reduce((acc, c) => acc + c.supplierCount, 0);

    expect(sum).toBe(repository.findAllSummaries().length);
  });

  it('counts each country correctly', () => {
    for (const country of service.findAll().data) {
      const actual = repository
        .findAllSummaries()
        .filter((s) => s.country.code === country.id).length;
      expect(country.supplierCount).toBe(actual);
    }
  });

  it('never reports a country with zero suppliers', () => {
    expect(service.findAll().data.every((c) => c.supplierCount > 0)).toBe(true);
  });

  it('uses the upper-cased ISO alpha-2 code as the id', () => {
    for (const country of service.findAll().data) {
      expect(country.id).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('pairs each id with the display name stored on the supplier', () => {
    const namesByCode = new Map(
      repository.findAllSummaries().map((s) => [s.country.code, s.country.name]),
    );

    for (const country of service.findAll().data) {
      expect(country.name).toBe(namesByCode.get(country.id));
    }
  });

  it('keeps ids unique', () => {
    const ids = service.findAll().data.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts by display name', () => {
    const names = service.findAll().data.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('returns a stable result across calls', () => {
    expect(service.findAll()).toEqual(service.findAll());
  });
});
