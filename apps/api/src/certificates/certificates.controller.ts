import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Certificates')
@Controller('certificates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get all earned certificates for authenticated student' })
  @ApiResponse({ status: 200, description: 'List of student certificates with verification codes' })
  async getMyCertificates(@CurrentUser('id') userId: string) {
    return this.certificatesService.getMyCertificates(userId);
  }
}

