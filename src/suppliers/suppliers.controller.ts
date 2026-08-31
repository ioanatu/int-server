import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SESSION_SECURITY_SCHEME } from '../common/constants';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { SupplierDetailDto } from './dto/supplier-detail.dto';
import { PaginatedSuppliersDto, SupplierListItemDto } from './dto/supplier-list-item.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Suppliers')
@ApiSecurity(SESSION_SECURITY_SCHEME)
@ApiUnauthorizedResponse({
  description: 'The `X-SESSION` header is missing or does not match the configured token.',
  type: ErrorResponseDto,
})
@ApiExtraModels(SupplierListItemDto)
@Controller({ path: 'suppliers', version: '1' })
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({
    summary: 'List suppliers',
    description:
      'Returns a paginated list of suppliers. All query parameters are optional and are ' +
      'combined with AND. `search` matches the supplier id, name, industry and country ' +
      'case-insensitively.',
  })
  @ApiOkResponse({ description: 'A page of suppliers.', type: PaginatedSuppliersDto })
  @ApiBadRequestResponse({
    description: 'One or more query parameters are invalid.',
    type: ErrorResponseDto,
  })
  findAll(@Query() query: ListSuppliersQueryDto): PaginatedSuppliersDto {
    return this.suppliersService.findAll(query);
  }

  @Get(':supplierId')
  @ApiOperation({
    summary: 'Get a supplier by id',
    description: 'Returns the full profile of a single supplier.',
  })
  @ApiParam({
    name: 'supplierId',
    description: 'Unique supplier identifier.',
    example: 'sup_001',
  })
  @ApiOkResponse({ description: 'The requested supplier.', type: SupplierDetailDto })
  @ApiNotFoundResponse({ description: 'No supplier exists with that id.', type: ErrorResponseDto })
  findOne(@Param('supplierId') supplierId: string): SupplierDetailDto {
    return this.suppliersService.findOne(supplierId);
  }
}
