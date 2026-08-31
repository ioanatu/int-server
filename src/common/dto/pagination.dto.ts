import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current 1-based page number.' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Requested page size.' })
  limit!: number;

  @ApiProperty({ example: 50, description: 'Total number of items matching the filters.' })
  total!: number;

  @ApiProperty({ example: true, description: 'Whether a following page exists.' })
  hasNext!: boolean;
}
