import { SuppliersRepository } from './suppliers.repository';

describe('SuppliersRepository (fixtures)', () => {
  let repository: SuppliersRepository;

  beforeAll(() => {
    repository = new SuppliersRepository();
    repository.onModuleInit();
  });

  it('loads exactly 50 supplier summaries', () => {
    expect(repository.findAllSummaries()).toHaveLength(50);
  });

  it('exposes a detail record for every summary', () => {
    for (const summary of repository.findAllSummaries()) {
      expect(repository.findDetailById(summary.id)).toBeDefined();
    }
  });

  it('keeps ids unique', () => {
    const ids = repository.findAllSummaries().map((supplier) => supplier.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the summary and the detail record consistent', () => {
    for (const summary of repository.findAllSummaries()) {
      const detail = repository.findDetailById(summary.id)!;
      expect(detail.id).toBe(summary.id);
      expect(detail.identity.name).toBe(summary.name);
      expect(detail.risk.score).toBe(summary.risk.score);
      expect(detail.risk.level).toBe(summary.risk.level);
      expect(detail.relationship.status).toBe(summary.relationship.status);
      expect(detail.address.country.code).toBe(summary.country.code);
    }
  });

  it('derives the risk level from the risk score', () => {
    for (const { risk } of repository.findAllSummaries()) {
      const expected = risk.score >= 75 ? 'high' : risk.score >= 45 ? 'medium' : 'low';
      expect(risk.level).toBe(expected);
    }
  });

  it('keeps the document counters internally consistent', () => {
    for (const summary of repository.findAllSummaries()) {
      const { total, valid, expiringSoon, expired } = repository.findDetailById(
        summary.id,
      )!.documents;
      expect(valid + expiringSoon + expired).toBe(total);
    }
  });

  it('returns undefined for an unknown id', () => {
    expect(repository.findDetailById('sup_does_not_exist')).toBeUndefined();
  });

  it('does not leak prototype properties through the id lookup', () => {
    expect(repository.findDetailById('__proto__')).toBeUndefined();
    expect(repository.findDetailById('constructor')).toBeUndefined();
  });
});
