/**
 * Generates the two static fixture files that back the read-only API:
 *
 *   src/data/suppliers.json  -> array of 50 supplier list items
 *   src/data/supplier.json   -> object keyed by supplier id -> full supplier detail
 *
 * The generator is fully deterministic (seeded PRNG), so re-running it produces
 * byte-identical files and the committed fixtures stay stable across machines.
 *
 * Usage: npm run generate:data
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const SUPPLIER_COUNT = 50;

/** mulberry32 — small, fast, deterministic PRNG. */
function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = createRandom(20260830);
const pick = (items) => items[Math.floor(rand() * items.length)];
const intBetween = (min, max) => min + Math.floor(rand() * (max - min + 1));

const COUNTRIES = [
  { code: 'DE', name: 'Germany', suffix: 'GmbH', vat: 'DE', dial: '+49 89', currency: 'EUR',
    cities: [['Munich', '80331', 'Hauptstraße'], ['Hamburg', '20095', 'Mönckebergstraße'], ['Cologne', '50667', 'Schildergasse']] },
  { code: 'FR', name: 'France', suffix: 'SAS', vat: 'FR', dial: '+33 1', currency: 'EUR',
    cities: [['Paris', '75001', 'Rue de Rivoli'], ['Lyon', '69002', 'Rue de la République']] },
  { code: 'IT', name: 'Italy', suffix: 'S.p.A.', vat: 'IT', dial: '+39 02', currency: 'EUR',
    cities: [['Milan', '20121', 'Via Montenapoleone'], ['Turin', '10121', 'Via Roma']] },
  { code: 'ES', name: 'Spain', suffix: 'S.L.', vat: 'ES', dial: '+34 91', currency: 'EUR',
    cities: [['Madrid', '28013', 'Gran Vía'], ['Barcelona', '08007', 'Passeig de Gràcia']] },
  { code: 'NL', name: 'Netherlands', suffix: 'B.V.', vat: 'NL', dial: '+31 20', currency: 'EUR',
    cities: [['Amsterdam', '1012', 'Damrak'], ['Rotterdam', '3011', 'Coolsingel']] },
  { code: 'PL', name: 'Poland', suffix: 'Sp. z o.o.', vat: 'PL', dial: '+48 22', currency: 'PLN',
    cities: [['Warsaw', '00-001', 'Marszałkowska'], ['Kraków', '31-008', 'Floriańska']] },
  { code: 'SE', name: 'Sweden', suffix: 'AB', vat: 'SE', dial: '+46 8', currency: 'SEK',
    cities: [['Stockholm', '111 20', 'Drottninggatan'], ['Gothenburg', '411 03', 'Avenyn']] },
  { code: 'GB', name: 'United Kingdom', suffix: 'Ltd', vat: 'GB', dial: '+44 20', currency: 'GBP',
    cities: [['London', 'EC1A 1BB', 'Cheapside'], ['Manchester', 'M1 1AE', 'Deansgate']] },
  { code: 'US', name: 'United States', suffix: 'Inc.', vat: 'US', dial: '+1 212', currency: 'USD',
    cities: [['New York', '10001', 'Broadway'], ['Chicago', '60601', 'Michigan Avenue']] },
  { code: 'CN', name: 'China', suffix: 'Co., Ltd.', vat: 'CN', dial: '+86 21', currency: 'CNY',
    cities: [['Shanghai', '200001', 'Nanjing Road'], ['Shenzhen', '518001', 'Shennan Avenue']] },
  { code: 'IN', name: 'India', suffix: 'Pvt Ltd', vat: 'IN', dial: '+91 22', currency: 'INR',
    cities: [['Mumbai', '400001', 'Marine Drive'], ['Bengaluru', '560001', 'MG Road']] },
  { code: 'JP', name: 'Japan', suffix: 'K.K.', vat: 'JP', dial: '+81 3', currency: 'JPY',
    cities: [['Tokyo', '100-0001', 'Chiyoda'], ['Osaka', '530-0001', 'Umeda']] },
  { code: 'BR', name: 'Brazil', suffix: 'Ltda', vat: 'BR', dial: '+55 11', currency: 'BRL',
    cities: [['São Paulo', '01310-100', 'Avenida Paulista']] },
  { code: 'TR', name: 'Türkiye', suffix: 'A.Ş.', vat: 'TR', dial: '+90 212', currency: 'TRY',
    cities: [['Istanbul', '34000', 'İstiklal Caddesi']] },
  { code: 'CZ', name: 'Czechia', suffix: 's.r.o.', vat: 'CZ', dial: '+420 2', currency: 'CZK',
    cities: [['Prague', '110 00', 'Václavské náměstí']] },
];

const INDUSTRIES = ['Manufacturing', 'Automotive', 'Chemicals', 'Electronics', 'Logistics',
  'Textiles', 'Food & Beverage', 'Pharmaceuticals', 'Construction', 'Metals & Mining',
  'Packaging', 'IT Services', 'Energy', 'Agriculture'];

const PROCUREMENT_CATEGORIES = ['Raw Materials', 'Components', 'Packaging', 'Logistics Services',
  'IT Services', 'Facility Management', 'Professional Services', 'Machinery', 'Chemicals',
  'Consumables'];

const NAME_PARTS_A = ['Nord', 'Alpen', 'Vertex', 'Lumen', 'Orbis', 'Cardinal', 'Helio', 'Terra',
  'Blue', 'Iron', 'Silva', 'Meridian', 'Astra', 'Prime', 'Kappa', 'Delta', 'Vega', 'Solaris',
  'Granite', 'Cobalt', 'Aurora', 'Baltic', 'Cypress', 'Everest', 'Falcon'];
const NAME_PARTS_B = ['Components', 'Industries', 'Logistics', 'Materials', 'Systems', 'Works',
  'Group', 'Technologies', 'Solutions', 'Partners', 'Supply', 'Chemicals', 'Foods', 'Metals',
  'Packaging'];

const RELATIONSHIP_STATUSES = ['active', 'active', 'active', 'onboarding', 'inactive', 'offboarded'];
const ASSESSMENT_STATUSES = ['completed', 'completed', 'completed', 'in_progress', 'not_started', 'expired'];

/** Risk band boundaries — higher score means higher risk. */
function riskLevelFor(score) {
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

const iso = (date) => `${date.toISOString().slice(0, 19)}Z`;
const isoDate = (date) => date.toISOString().slice(0, 10);
const daysAgo = (days) => new Date(Date.UTC(2026, 7, 30, 14, 0, 0) - days * 86400000);
const addYear = (date) => new Date(Date.UTC(date.getUTCFullYear() + 1, date.getUTCMonth(), date.getUTCDate()));

const slug = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const digits = (length) => Array.from({ length }, () => intBetween(0, 9)).join('');
const padId = (index) => `sup_${String(index).padStart(3, '0')}`;

/**
 * The first record mirrors the reference object from the requirements verbatim so the
 * documented sample queries (e.g. `?search=example`) return a predictable result.
 */
function referenceSupplier() {
  return {
    id: 'sup_001',
    name: 'Example Supplier GmbH',
    legalName: 'Example Supplier GmbH',
    country: { code: 'DE', name: 'Germany' },
    industry: 'Manufacturing',
    relationshipStatus: 'active',
    tier: 1,
    riskScore: 82,
    assessmentStatus: 'completed',
    assessmentScore: 84,
    identifiers: { vatNumber: 'DE123456789', lei: '529900EXAMPLE123456', duns: '123456789' },
    address: { street: 'Hauptstraße 123', city: 'Munich', postalCode: '80331', country: { code: 'DE', name: 'Germany' } },
    contact: { email: 'contact@example-supplier.com', phone: '+49 89 123456', website: 'https://example-supplier.com' },
    company: { industry: 'Manufacturing', employeeCount: 250, foundedYear: 1998 },
    since: '2024-01-01',
    procurement: { category: 'Raw Materials', annualSpend: { amount: 1250000, currency: 'EUR' } },
    riskCalculatedAt: '2026-08-30T14:00:00Z',
    assessmentCompletedAt: '2026-07-12T09:30:00Z',
    assessmentExpiresAt: '2027-07-12T00:00:00Z',
    documents: { total: 12, valid: 10, expiringSoon: 2, expired: 0 },
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2026-08-30T14:00:00Z',
  };
}

function randomSupplier(index) {
  const country = pick(COUNTRIES);
  const [city, postalCode, street] = pick(country.cities);
  const baseName = `${pick(NAME_PARTS_A)} ${pick(NAME_PARTS_B)}`;
  const name = `${baseName} ${country.suffix}`;
  const industry = pick(INDUSTRIES);
  const riskScore = intBetween(8, 97);
  const assessmentStatus = pick(ASSESSMENT_STATUSES);
  const isAssessed = assessmentStatus === 'completed' || assessmentStatus === 'expired';
  const completedAt = isAssessed ? daysAgo(intBetween(20, 700)) : null;
  const updatedAt = daysAgo(intBetween(0, 120));
  const createdAt = daysAgo(intBetween(400, 2600));
  const domain = `${slug(baseName)}.example.com`;

  return {
    id: padId(index),
    name,
    legalName: `${baseName} ${country.suffix}`,
    country: { code: country.code, name: country.name },
    industry,
    relationshipStatus: pick(RELATIONSHIP_STATUSES),
    tier: intBetween(1, 3),
    riskScore,
    assessmentStatus,
    assessmentScore: isAssessed ? intBetween(35, 99) : null,
    identifiers: {
      vatNumber: `${country.vat}${digits(9)}`,
      lei: `5299${digits(14)}`.slice(0, 20),
      duns: digits(9),
    },
    address: {
      street: `${street} ${intBetween(1, 240)}`,
      city,
      postalCode,
      country: { code: country.code, name: country.name },
    },
    contact: {
      email: `contact@${domain}`,
      phone: `${country.dial} ${digits(6)}`,
      website: `https://${domain}`,
    },
    company: {
      industry,
      employeeCount: intBetween(12, 24000),
      foundedYear: intBetween(1945, 2021),
    },
    since: isoDate(createdAt),
    procurement: {
      category: pick(PROCUREMENT_CATEGORIES),
      annualSpend: { amount: intBetween(25, 9800) * 1000, currency: country.currency },
    },
    riskCalculatedAt: iso(updatedAt),
    assessmentCompletedAt: completedAt ? iso(completedAt) : null,
    assessmentExpiresAt: completedAt ? `${isoDate(addYear(completedAt))}T00:00:00Z` : null,
    documents: (() => {
      const total = intBetween(0, 24);
      const expired = intBetween(0, Math.min(3, total));
      const expiringSoon = intBetween(0, Math.min(4, total - expired));
      return { total, valid: total - expired - expiringSoon, expiringSoon, expired };
    })(),
    createdAt: iso(createdAt),
    updatedAt: iso(updatedAt),
  };
}

const seeds = [referenceSupplier()];
for (let index = 2; index <= SUPPLIER_COUNT; index += 1) {
  seeds.push(randomSupplier(index));
}

/** Summary shape served by GET /api/v1/suppliers (source of truth: suppliers.json). */
const suppliers = seeds.map((seed) => ({
  id: seed.id,
  name: seed.name,
  country: seed.country,
  industry: seed.industry,
  relationship: { status: seed.relationshipStatus, tier: seed.tier },
  risk: { score: seed.riskScore, level: riskLevelFor(seed.riskScore) },
  assessment: {
    status: seed.assessmentStatus,
    score: seed.assessmentScore,
    lastCompletedAt: seed.assessmentCompletedAt,
  },
  updatedAt: seed.updatedAt,
}));

/** Detail shape served by GET /api/v1/suppliers/{supplierId} (source: supplier.json). */
const supplier = Object.fromEntries(
  seeds.map((seed) => [
    seed.id,
    {
      id: seed.id,
      identity: { name: seed.name, legalName: seed.legalName, identifiers: seed.identifiers },
      address: seed.address,
      contact: seed.contact,
      company: seed.company,
      relationship: {
        status: seed.relationshipStatus,
        tier: seed.tier,
        since: seed.since,
        procurement: seed.procurement,
      },
      risk: {
        score: seed.riskScore,
        level: riskLevelFor(seed.riskScore),
        lastCalculatedAt: seed.riskCalculatedAt,
      },
      assessment: {
        status: seed.assessmentStatus,
        score: seed.assessmentScore,
        lastCompletedAt: seed.assessmentCompletedAt,
        expiresAt: seed.assessmentExpiresAt,
      },
      documents: seed.documents,
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt,
    },
  ]),
);

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(join(DATA_DIR, 'suppliers.json'), `${JSON.stringify(suppliers, null, 2)}\n`);
writeFileSync(join(DATA_DIR, 'supplier.json'), `${JSON.stringify(supplier, null, 2)}\n`);

console.log(`Wrote ${suppliers.length} suppliers to ${DATA_DIR}`);
