import {
  DEFAULT_DEV_CORS_ORIGINS,
  DEFAULT_PROD_CORS_ORIGINS,
  parseCorsOrigins,
} from './configuration';

describe('parseCorsOrigins', () => {
  it('splits and trims a comma-separated allow-list', () => {
    expect(parseCorsOrigins(' https://a.example , https://b.example ', 'production')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('treats "*" as "reflect any origin"', () => {
    expect(parseCorsOrigins('*', 'production')).toBe(true);
  });

  it('honours "*" even when mixed into a list, instead of matching it literally', () => {
    expect(parseCorsOrigins('https://a.example,*', 'production')).toBe(true);
  });

  it.each([undefined, '', '   ', ',,'])('falls back when the value is %p', (raw) => {
    expect(parseCorsOrigins(raw, 'development')).toEqual(DEFAULT_DEV_CORS_ORIGINS);
    expect(parseCorsOrigins(raw, 'production')).toEqual(DEFAULT_PROD_CORS_ORIGINS);
  });

  it('never falls back to a wildcard', () => {
    expect(parseCorsOrigins(undefined, 'production')).not.toBe(true);
    expect(parseCorsOrigins(undefined, 'development')).not.toBe(true);
  });
});
