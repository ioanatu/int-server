import { ApiProperty } from '@nestjs/swagger';
import { ASSESSMENT_STATUSES, RELATIONSHIP_STATUSES, RISK_LEVELS } from '../supplier.constants';
import type { AssessmentStatus, RelationshipStatus, RiskLevel } from '../supplier.types';

export class CountryDto {
  @ApiProperty({ example: 'DE' })
  code!: string;

  @ApiProperty({ example: 'Germany' })
  name!: string;
}

export class SupplierIdentifiersDto {
  @ApiProperty({ example: 'DE123456789' })
  vatNumber!: string;

  @ApiProperty({ example: '529900EXAMPLE123456' })
  lei!: string;

  @ApiProperty({ example: '123456789' })
  duns!: string;
}

export class SupplierIdentityDto {
  @ApiProperty({ example: 'Example Supplier GmbH' })
  name!: string;

  @ApiProperty({ example: 'Example Supplier GmbH' })
  legalName!: string;

  @ApiProperty({ type: SupplierIdentifiersDto })
  identifiers!: SupplierIdentifiersDto;
}

export class SupplierAddressDto {
  @ApiProperty({ example: 'Hauptstraße 123' })
  street!: string;

  @ApiProperty({ example: 'Munich' })
  city!: string;

  @ApiProperty({ example: '80331' })
  postalCode!: string;

  @ApiProperty({ type: CountryDto })
  country!: CountryDto;
}

export class SupplierContactDto {
  @ApiProperty({ example: 'contact@example-supplier.com' })
  email!: string;

  @ApiProperty({ example: '+49 89 123456' })
  phone!: string;

  @ApiProperty({ example: 'https://example-supplier.com' })
  website!: string;
}

export class SupplierCompanyDto {
  @ApiProperty({ example: 'Manufacturing' })
  industry!: string;

  @ApiProperty({ example: 250 })
  employeeCount!: number;

  @ApiProperty({ example: 1998 })
  foundedYear!: number;
}

export class AnnualSpendDto {
  @ApiProperty({ example: 1250000 })
  amount!: number;

  @ApiProperty({ description: 'ISO 4217 currency code.', example: 'EUR' })
  currency!: string;
}

export class ProcurementDto {
  @ApiProperty({ example: 'Raw Materials' })
  category!: string;

  @ApiProperty({ type: AnnualSpendDto })
  annualSpend!: AnnualSpendDto;
}

export class SupplierRelationshipDto {
  @ApiProperty({ enum: RELATIONSHIP_STATUSES, example: 'active' })
  status!: RelationshipStatus;

  @ApiProperty({ description: 'Supplier tier, 1 being the most strategic.', example: 1 })
  tier!: number;

  @ApiProperty({ format: 'date', example: '2024-01-01' })
  since!: string;

  @ApiProperty({ type: ProcurementDto })
  procurement!: ProcurementDto;
}

export class SupplierRiskDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 82 })
  score!: number;

  @ApiProperty({ enum: RISK_LEVELS, example: 'high' })
  level!: RiskLevel;

  @ApiProperty({ format: 'date-time', example: '2026-08-30T14:00:00Z' })
  lastCalculatedAt!: string;
}

export class SupplierAssessmentDto {
  @ApiProperty({ enum: ASSESSMENT_STATUSES, example: 'completed' })
  status!: AssessmentStatus;

  @ApiProperty({
    nullable: true,
    description: 'Null until an assessment has been completed at least once.',
    example: 84,
  })
  score!: number | null;

  @ApiProperty({ format: 'date-time', nullable: true, example: '2026-07-12T09:30:00Z' })
  lastCompletedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, example: '2027-07-12T00:00:00Z' })
  expiresAt!: string | null;
}

export class SupplierDocumentsDto {
  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 10 })
  valid!: number;

  @ApiProperty({ example: 2 })
  expiringSoon!: number;

  @ApiProperty({ example: 0 })
  expired!: number;
}

/** Full supplier record returned by `GET /api/v1/suppliers/{supplierId}`. */
export class SupplierDetailDto {
  @ApiProperty({ example: 'sup_001' })
  id!: string;

  @ApiProperty({ type: SupplierIdentityDto })
  identity!: SupplierIdentityDto;

  @ApiProperty({ type: SupplierAddressDto })
  address!: SupplierAddressDto;

  @ApiProperty({ type: SupplierContactDto })
  contact!: SupplierContactDto;

  @ApiProperty({ type: SupplierCompanyDto })
  company!: SupplierCompanyDto;

  @ApiProperty({ type: SupplierRelationshipDto })
  relationship!: SupplierRelationshipDto;

  @ApiProperty({ type: SupplierRiskDto })
  risk!: SupplierRiskDto;

  @ApiProperty({ type: SupplierAssessmentDto })
  assessment!: SupplierAssessmentDto;

  @ApiProperty({ type: SupplierDocumentsDto })
  documents!: SupplierDocumentsDto;

  @ApiProperty({ format: 'date-time', example: '2024-01-01T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', example: '2026-08-30T14:00:00Z' })
  updatedAt!: string;
}
