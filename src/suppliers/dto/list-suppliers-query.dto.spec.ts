import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListSuppliersQueryDto } from './list-suppliers-query.dto';

/** Mirrors what the global ValidationPipe does to the raw query object. */
const parse = (raw: Record<string, unknown>) => {
  const dto = plainToInstance(ListSuppliersQueryDto, raw, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, errors };
};

const messagesOf = (raw: Record<string, unknown>): string[] =>
  parse(raw).errors.flatMap((error) => Object.values(error.constraints ?? {}));

describe('ListSuppliersQueryDto — country', () => {
  it('leaves the filter unset when the parameter is absent', () => {
    const { dto, errors } = parse({});

    expect(errors).toEqual([]);
    expect(dto.country).toBeUndefined();
  });

  it('wraps a single value in an array', () => {
    const { dto, errors } = parse({ country: 'DE' });

    expect(errors).toEqual([]);
    expect(dto.country).toEqual(['DE']);
  });

  it('accepts the parameter repeated, as Express parses ?country=DE&country=FR', () => {
    const { dto, errors } = parse({ country: ['DE', 'FR'] });

    expect(errors).toEqual([]);
    expect(dto.country).toEqual(['DE', 'FR']);
  });

  it('splits a comma-separated list', () => {
    const { dto, errors } = parse({ country: 'DE,FR,NL' });

    expect(errors).toEqual([]);
    expect(dto.country).toEqual(['DE', 'FR', 'NL']);
  });

  it('upper-cases and trims every entry', () => {
    const { dto, errors } = parse({ country: ' de , fr ' });

    expect(errors).toEqual([]);
    expect(dto.country).toEqual(['DE', 'FR']);
  });

  it('de-duplicates entries, across both notations', () => {
    const { dto, errors } = parse({ country: ['DE,fr', 'FR', 'de'] });

    expect(errors).toEqual([]);
    expect(dto.country).toEqual(['DE', 'FR']);
  });

  it('drops empty entries left by a trailing or doubled comma', () => {
    const { dto, errors } = parse({ country: 'DE,,FR,' });

    expect(errors).toEqual([]);
    expect(dto.country).toEqual(['DE', 'FR']);
  });

  it('rejects an entry that is not a 2-letter code', () => {
    expect(messagesOf({ country: 'DEU' })).toContain('country must be a 2-letter ISO country code');
    expect(messagesOf({ country: 'DE,DEU' })).toContain(
      'country must be a 2-letter ISO country code',
    );
  });

  it('rejects an empty selection', () => {
    expect(messagesOf({ country: '' })).toContain('country must not be empty');
    expect(messagesOf({ country: ',' })).toContain('country must not be empty');
  });

  it('rejects more than 50 country codes', () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `X${i}`).join(',');

    expect(messagesOf({ country: tooMany })).toContain('country accepts at most 50 country codes');
  });

  it('accepts exactly 50 country codes', () => {
    // Two letters each, all distinct, so only the size limit is under test.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const codes = Array.from({ length: 50 }, (_, i) => `${alphabet[i % 26]}${alphabet[i % 2]}`);
    const distinct = [...new Set(codes)];

    expect(parse({ country: distinct.join(',') }).errors).toEqual([]);
  });

  it('does not throw on a non-string entry, and reports it as invalid', () => {
    expect(() => parse({ country: [{ nested: 'object' }] })).not.toThrow();
    expect(messagesOf({ country: [{ nested: 'object' }] }).length).toBeGreaterThan(0);
  });

  it('leaves the other filters as scalars', () => {
    const { dto, errors } = parse({ status: 'ACTIVE', industry: ' Manufacturing ' });

    expect(errors).toEqual([]);
    expect(dto.status).toBe('active');
    expect(dto.industry).toBe('Manufacturing');
  });
});
