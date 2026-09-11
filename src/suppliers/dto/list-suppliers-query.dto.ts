import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ASSESSMENT_STATUSES, RELATIONSHIP_STATUSES, RISK_LEVELS } from '../supplier.constants';
import type { AssessmentStatus, RelationshipStatus, RiskLevel } from '../supplier.types';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Upper bound on how many countries one request may select. */
const MAX_COUNTRIES = 50;

/**
 * Normalises the `country` parameter into a de-duplicated array of upper-cased codes.
 *
 * Accepts every shape a client might reasonably send — a single value
 * (`?country=de`), the parameter repeated (`?country=de&country=fr`) and a
 * comma-separated list (`?country=de,fr`) — so a multi-select in the UI can use
 * whichever its HTTP client produces. Non-string entries are passed through
 * untouched so the validators below reject them rather than the transform
 * throwing.
 */
const upperCodeList = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null) {
    return value;
  }

  const entries = (Array.isArray(value) ? value : [value]).flatMap((entry) =>
    typeof entry === 'string' ? entry.split(',') : [entry],
  );

  const normalised = entries
    .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : entry))
    .filter((entry) => entry !== '');

  // Duplicates would only cost work downstream; the filter is a set membership test.
  return [...new Set(normalised)];
};

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
    description:
      'One or more ISO 3166-1 alpha-2 country codes, as served by `GET /api/v1/countries`. ' +
      'Repeat the parameter (`?country=DE&country=FR`) or pass a comma-separated list ' +
      '(`?country=DE,FR`); a supplier matches when its country is any of them. ' +
      'Case-insensitive.',
    type: [String],
    example: ['DE', 'FR'],
  })
  @IsOptional()
  @Transform(upperCodeList)
  @ArrayNotEmpty({ message: 'country must not be empty' })
  @ArrayMaxSize(MAX_COUNTRIES, {
    message: `country accepts at most ${MAX_COUNTRIES} country codes`,
  })
  @IsString({ each: true })
  @Length(2, 2, { each: true, message: 'country must be a 2-letter ISO country code' })
  country?: string[];

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
