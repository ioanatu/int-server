/**
 * Deliberately empty.
 *
 * The endpoint takes no parameters, but binding an empty DTO makes the global
 * ValidationPipe (`whitelist` + `forbidNonWhitelisted`) reject anything a client
 * sends, so a typo like `?limt=10` fails loudly here exactly as it does on
 * `GET /api/v1/suppliers` rather than being silently ignored.
 */
export class ListCountriesQueryDto {}
