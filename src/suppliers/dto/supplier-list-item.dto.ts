import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { RELATIONSHIP_STATUSES, RISK_LEVELS } from '../supplier.constants';
import type { RelationshipStatus, RiskLevel } from '../supplier.types';

export class SupplierRiskSummaryDto {
  @ApiProperty({ enum: RISK_LEVELS, example: 'high' })
  level!: RiskLevel;

  @ApiProperty({ minimum: 0, maximum: 100, example: 82 })
  score!: number;
}

/** Flattened list projection returned by `GET /api/v1/suppliers`. */
export class SupplierListItemDto {
  @ApiProperty({ example: 'sup_001' })
  id!: string;

  @ApiProperty({ example: 'Example Supplier GmbH' })
  name!: string;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code.', example: 'DE' })
  country!: string;

  @ApiProperty({ enum: RELATIONSHIP_STATUSES, example: 'active' })
  status!: RelationshipStatus;

  @ApiProperty({ type: SupplierRiskSummaryDto })
  risk!: SupplierRiskSummaryDto;
}

export class PaginatedSuppliersDto {
  @ApiProperty({ type: [SupplierListItemDto] })
  data!: SupplierListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
