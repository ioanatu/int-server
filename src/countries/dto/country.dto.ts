import { ApiProperty } from '@nestjs/swagger';

/**
 * One selectable value in the country filter.
 *
 * Named `CountryOption*` rather than `Country*` because `CountryDto` is already taken in
 * the OpenAPI document by the `{ code, name }` object nested in a supplier's address.
 * Nest keys `components.schemas` by class name, so reusing the name would make one
 * definition silently overwrite the other.
 */
export class CountryOptionDto {
  @ApiProperty({
    description:
      'ISO 3166-1 alpha-2 code. Stable and URL-safe — pass this verbatim in the `country` ' +
      'filter on `GET /api/v1/suppliers`.',
    example: 'DE',
    minLength: 2,
    maxLength: 2,
  })
  id!: string;

  @ApiProperty({
    description: 'Display name, as stored on the supplier.',
    example: 'Germany',
  })
  name!: string;

  @ApiProperty({
    description: 'How many suppliers are currently based in this country.',
    minimum: 1,
    example: 3,
  })
  supplierCount!: number;
}

export class CountryOptionListDto {
  @ApiProperty({ type: [CountryOptionDto], description: 'Countries, sorted by name.' })
  data!: CountryOptionDto[];

  @ApiProperty({ description: 'Number of distinct countries.', example: 14 })
  total!: number;
}
