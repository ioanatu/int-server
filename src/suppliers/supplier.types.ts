export type RelationshipStatus = 'active' | 'inactive' | 'onboarding' | 'offboarded';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AssessmentStatus = 'completed' | 'in_progress' | 'not_started' | 'expired';

export interface CountryRef {
  code: string;
  name: string;
}

/** Shape of a single entry in `src/data/suppliers.json`. */
export interface SupplierListRecord {
  id: string;
  name: string;
  country: CountryRef;
  industry: string;
  relationship: { status: RelationshipStatus; tier: number };
  risk: { score: number; level: RiskLevel };
  assessment: {
    status: AssessmentStatus;
    score: number | null;
    lastCompletedAt: string | null;
  };
  updatedAt: string;
}

/** Shape of a single value in `src/data/supplier.json`, keyed by supplier id. */
export interface SupplierDetailRecord {
  id: string;
  identity: {
    name: string;
    legalName: string;
    identifiers: { vatNumber: string; lei: string; duns: string };
  };
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: CountryRef;
  };
  contact: { email: string; phone: string; website: string };
  company: { industry: string; employeeCount: number; foundedYear: number };
  relationship: {
    status: RelationshipStatus;
    tier: number;
    since: string;
    procurement: {
      category: string;
      annualSpend: { amount: number; currency: string };
    };
  };
  risk: { score: number; level: RiskLevel; lastCalculatedAt: string };
  assessment: {
    status: AssessmentStatus;
    score: number | null;
    lastCompletedAt: string | null;
    expiresAt: string | null;
  };
  documents: { total: number; valid: number; expiringSoon: number; expired: number };
  createdAt: string;
  updatedAt: string;
}

export type SupplierDetailMap = Record<string, SupplierDetailRecord>;
