import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';
import { RevokeCertificateDto } from './dto/revoke-certificate.dto';

@ApiTags('Certificates & Accreditation')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // -------------------------------------------------------------
  // 1. PUBLIC VERIFICATION (NO AUTH REQUIRED)
  // -------------------------------------------------------------

  @Get('verify/:verificationCode')
  @ApiOperation({ summary: 'Publicly verify an accredited certificate by verification code' })
  @ApiParam({ name: 'verificationCode', description: 'Unique certificate verification code' })
  @ApiResponse({ status: 200, description: 'Certificate verification result returned' })
  async verifyPublic(@Param('verificationCode') verificationCode: string) {
    return this.certificatesService.verifyPublic(verificationCode);
  }

  // -------------------------------------------------------------
  // 2. PUBLIC OR AUTHENTICATED PDF EXPORT
  // -------------------------------------------------------------

  @Get('download/:identifier')
  @ApiOperation({ summary: 'Download authentic Certificate PDF by ID or Verification Code' })
  @ApiParam({ name: 'identifier', description: 'Certificate ID or Verification Code' })
  @ApiResponse({ status: 200, description: 'Binary PDF file stream' })
  async downloadPdf(
    @Param('identifier') identifier: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.certificatesService.downloadPdf(identifier);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  // -------------------------------------------------------------
  // 3. STUDENT CERTIFICATE ACCESS & CLAIMING (JWT PROTECTED)
  // -------------------------------------------------------------

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all earned certificates for authenticated student' })
  @ApiResponse({ status: 200, description: 'List of student certificates with verification codes' })
  async getMyCertificates(@CurrentUser('id') userId: string) {
    return this.certificatesService.getMyCertificates(userId);
  }

  @Get('check-eligibility/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if student is eligible to receive a certificate for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Eligibility status returned' })
  async checkEligibility(
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.certificatesService.checkEligibility(userId, courseId);
  }

  @Post('claim/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Claim and generate verifiable certificate upon 100% course completion' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 201, description: 'Certificate awarded and generated' })
  @ApiResponse({ status: 400, description: 'Course not completed' })
  async claimCertificate(
    @CurrentUser('id') userId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.certificatesService.claimCertificate(userId, courseId);
  }

  // -------------------------------------------------------------
  // 4. ADMINISTRATIVE REVOCATION
  // -------------------------------------------------------------

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke an issued certificate (Super Admin or Institution Admin)' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  async revokeCertificate(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) certificateId: string,
    @Body() dto: RevokeCertificateDto,
  ) {
    return this.certificatesService.revokeCertificate(adminUserId, certificateId, dto.reason);
  }
}
