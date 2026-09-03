/**
 * Normalises a human-readable label into a URL-safe identifier.
 *
 * Used to derive stable industry ids ("Food & Beverage" -> "food-beverage") so the
 * frontend can put them straight into a query string without percent-encoding
 * ampersands and spaces.
 *
 * Because the function is idempotent — `toSlug(toSlug(x)) === toSlug(x)` — running
 * both sides of a comparison through it makes a filter accept either the display
 * name or the id, case-insensitively, with a single equality check.
 */
export function toSlug(value: string): string {
  return (
    value
      .normalize('NFD')
      // strip combining diacritical marks so "Türkiye" and "Turkiye" agree
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}
