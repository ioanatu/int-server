import type { AssessmentStatus, RelationshipStatus, RiskLevel } from './supplier.types';

export const RELATIONSHIP_STATUSES: RelationshipStatus[] = [
  'active',
  'inactive',
  'onboarding',
  'offboarded',
];

export const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];

export const ASSESSMENT_STATUSES: AssessmentStatus[] = [
  'completed',
  'in_progress',
  'not_started',
  'expired',
];
