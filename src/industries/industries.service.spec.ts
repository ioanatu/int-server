import { Test } from '@nestjs/testing';
import { toSlug } from '../common/slug';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
import { IndustriesService } from './industries.service';

describe('IndustriesService', () => {
  let service: IndustriesService;
  let repository: SuppliersRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [IndustriesService, SuppliersRepository],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(IndustriesService);
    repository = moduleRef.get(SuppliersRepository);
  });

  it('returns every distinct industry in the supplier data', () => {
    const expected = new Set(repository.findAllSummaries().map((s) => s.industry));
    const result = service.findAll();

    expect(result.total).toBe(expected.size);
    expect(result.data).toHaveLength(expected.size);
    expect(new Set(result.data.map((i) => i.name))).toEqual(expected);
  });

  it('reports a count per industry that sums to the supplier total', () => {
    const result = service.findAll();
    const sum = result.data.reduce((acc, i) => acc + i.supplierCount, 0);

    expect(sum).toBe(repository.findAllSummaries().length);
  });

  it('counts each industry correctly', () => {
    const result = service.findAll();

    for (const industry of result.data) {
      const actual = repository
        .findAllSummaries()
        .filter((s) => s.industry === industry.name).length;
      expect(industry.supplierCount).toBe(actual);
    }
  });

  it('never reports an industry with zero suppliers', () => {
    expect(service.findAll().data.every((i) => i.supplierCount > 0)).toBe(true);
  });

  it('derives a URL-safe id from the display name', () => {
    for (const industry of service.findAll().data) {
      expect(industry.id).toBe(toSlug(industry.name));
      expect(industry.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('keeps ids unique', () => {
    const ids = service.findAll().data.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts by display name', () => {
    const names = service.findAll().data.map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('returns a stable result across calls', () => {
    expect(service.findAll()).toEqual(service.findAll());
  });
});
