import { ApiProperty } from '@nestjs/swagger';

/** Documents the single error envelope produced by `AllExceptionsFilter`. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Not Found' })
  error!: string;

  @ApiProperty({
    description: 'Human readable description, or a list of validation errors.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: "Supplier with id 'sup_999' was not found.",
  })
  message!: string | string[];

  @ApiProperty({ example: '/api/v1/suppliers/sup_999' })
  path!: string;

  @ApiProperty({ example: '2026-08-30T14:00:00.000Z' })
  timestamp!: string;
}
