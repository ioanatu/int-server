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
import { CountriesService } from './countries.service';
import { CountryOptionListDto } from './dto/country.dto';
import { ListCountriesQueryDto } from './dto/list-countries-query.dto';

@ApiTags('Countries')
@ApiSecurity(SESSION_SECURITY_SCHEME)
@ApiUnauthorizedResponse({
  description: 'The `X-SESSION` header is missing or does not match the configured token.',
  type: ErrorResponseDto,
})
@Controller({ path: 'countries', version: '1' })
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List countries',
    description:
      'Returns every country present in the supplier data, with the number of suppliers ' +
      'in each. Intended to populate a country filter: pass one or more entry `id`s as the ' +
      '`country` query parameter on `GET /api/v1/suppliers` (repeat the parameter or use a ' +
      'comma-separated list to select several). The list is unpaginated — it is a small, ' +
      'closed set.',
  })
  @ApiOkResponse({
    description: 'All known countries, sorted by name.',
    type: CountryOptionListDto,
  })
  @ApiBadRequestResponse({
    description: 'The endpoint takes no query parameters.',
    type: ErrorResponseDto,
  })
  findAll(@Query() _query: ListCountriesQueryDto): CountryOptionListDto {
    return this.countriesService.findAll();
  }
}
