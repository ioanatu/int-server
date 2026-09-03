import { toSlug } from './slug';

describe('toSlug', () => {
  it.each([
    ['Manufacturing', 'manufacturing'],
    ['IT Services', 'it-services'],
    ['Food & Beverage', 'food-beverage'],
    ['Metals & Mining', 'metals-mining'],
  ])('slugifies %s -> %s', (input, expected) => {
    expect(toSlug(input)).toBe(expected);
  });

  it('is idempotent, so a slug round-trips unchanged', () => {
    for (const value of ['Food & Beverage', 'IT Services', 'Manufacturing']) {
      expect(toSlug(toSlug(value))).toBe(toSlug(value));
    }
  });

  it('is case-insensitive', () => {
    expect(toSlug('FOOD & BEVERAGE')).toBe(toSlug('food & beverage'));
  });

  it('strips diacritics', () => {
    expect(toSlug('Türkiye')).toBe('turkiye');
  });

  it('trims separator runs at both ends', () => {
    expect(toSlug('  & Raw Materials & ')).toBe('raw-materials');
  });

  it('collapses runs of separators', () => {
    expect(toSlug('Food  &&  Beverage')).toBe('food-beverage');
  });

  it('returns an empty string when nothing survives normalisation', () => {
    expect(toSlug('&&&')).toBe('');
  });
});
