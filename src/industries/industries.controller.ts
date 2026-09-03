import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SESSION_SECURITY_SCHEME } from '../common/constants';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { IndustryListDto } from './dto/industry.dto';
import { ListIndustriesQueryDto } from './dto/list-industries-query.dto';
import { IndustriesService } from './industries.service';

@ApiTags('Industries')
@ApiSecurity(SESSION_SECURITY_SCHEME)
@ApiUnauthorizedResponse({
  description: 'The `X-SESSION` header is missing or does not match the configured token.',
  type: ErrorResponseDto,
})
@Controller({ path: 'industries', version: '1' })
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List industries',
    description:
      'Returns every industry present in the supplier data, with the number of suppliers ' +
      'in each. Intended to populate an industry filter: pass an entry `id` as the ' +
      '`industry` query parameter on `GET /api/v1/suppliers`. The list is unpaginated — ' +
      'it is a small, closed set.',
  })
  @ApiOkResponse({ description: 'All known industries, sorted by name.', type: IndustryListDto })
  @ApiBadRequestResponse({
    description: 'The endpoint takes no query parameters.',
    type: ErrorResponseDto,
  })
  findAll(@Query() _query: ListIndustriesQueryDto): IndustryListDto {
    return this.industriesService.findAll();
  }
}
