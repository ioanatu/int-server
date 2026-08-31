import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

class HealthResponseDto {
  status!: 'ok';
  uptime!: number;
  timestamp!: string;
}

/**
 * Unauthenticated liveness probe. Kept outside the versioned `/api` prefix so
 * platform health checks (Heroku, uptime monitors) do not need the session token
 * and are not tied to an API version.
 */
@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'The service is up.' })
  @ApiExcludeEndpoint(false)
  check(): HealthResponseDto {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
