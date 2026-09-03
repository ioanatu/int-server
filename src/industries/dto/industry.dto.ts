import { ApiProperty } from '@nestjs/swagger';

export class IndustryDto {
  @ApiProperty({
    description:
      'Stable, URL-safe identifier. Pass this verbatim as the `industry` filter on ' +
      '`GET /api/v1/suppliers`.',
    example: 'food-beverage',
  })
  id!: string;

  @ApiProperty({
    description: 'Display name, as stored on the supplier.',
    example: 'Food & Beverage',
  })
  name!: string;

  @ApiProperty({
    description: 'How many suppliers currently sit in this industry.',
    minimum: 1,
    example: 5,
  })
  supplierCount!: number;
}

export class IndustryListDto {
  @ApiProperty({ type: [IndustryDto], description: 'Industries, sorted by name.' })
  data!: IndustryDto[];

  @ApiProperty({ description: 'Number of distinct industries.', example: 14 })
  total!: number;
}
