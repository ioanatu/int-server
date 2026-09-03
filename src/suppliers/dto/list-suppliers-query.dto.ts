import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { ASSESSMENT_STATUSES, RELATIONSHIP_STATUSES, RISK_LEVELS } from '../supplier.constants';
import type { AssessmentStatus, RelationshipStatus, RiskLevel } from '../supplier.types';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const lower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Query parameters accepted by `GET /api/v1/suppliers`. */
export class ListSuppliersQueryDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive free-text search across supplier id, name, industry and country name.',
    example: 'example',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  search?: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 country code. Case-insensitive.',
    example: 'DE',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @Transform(upper)
  @IsString()
  @Length(2, 2, { message: 'country must be a 2-letter ISO country code' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Business relationship status.',
    enum: RELATIONSHIP_STATUSES,
    example: 'active',
  })
  @IsOptional()
  @Transform(lower)
  @IsIn(RELATIONSHIP_STATUSES)
  status?: RelationshipStatus;

  @ApiPropertyOptional({
    description: 'Risk band derived from the risk score.',
    enum: RISK_LEVELS,
    example: 'high',
  })
  @IsOptional()
  @Transform(lower)
  @IsIn(RISK_LEVELS)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({
    description: 'Latest assessment status.',
    enum: ASSESSMENT_STATUSES,
    example: 'completed',
  })
  @IsOptional()
  @Transform(lower)
  @IsIn(ASSESSMENT_STATUSES)
  assessmentStatus?: AssessmentStatus;

  @ApiPropertyOptional({
    description:
      'Industry to filter by. Accepts either the `id` from `GET /api/v1/industries` ' +
      '(recommended — URL-safe) or the display name. Case-insensitive.',
    example: 'food-beverage',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  industry?: string;

  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page.',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1)
  @Max(100)
  limit: number = 10;
}
