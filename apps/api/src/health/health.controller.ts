import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('System & Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'System Health Check' })
  @ApiResponse({
    status: 200,
    description: 'Returns the health status of the application runtime and database connectivity.',
  })
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.checkHealth();
  }
}

