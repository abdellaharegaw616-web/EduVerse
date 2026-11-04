import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';
import { TeacherAnalyticsQueryDto } from './dto/teacher-analytics-query.dto';
import { InstitutionAnalyticsQueryDto } from './dto/institution-analytics-query.dto';
import { PlatformAnalyticsQueryDto } from './dto/platform-analytics-query.dto';

@ApiTags('Analytics & Telemetry Reporting')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // -------------------------------------------------------------
  // 1. STUDENT ANALYTICS
  // -------------------------------------------------------------

  @Get('student')
  @Roles(Role.STUDENT, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Student personal learning telemetry, progress, and quiz analytics' })
  @ApiResponse({ status: 200, description: 'Student analytics returned' })
  async getStudentAnalytics(@CurrentUser('id') userId: string) {
    return this.analyticsService.getStudentAnalytics(userId);
  }

  // -------------------------------------------------------------
  // 2. TEACHER ANALYTICS
  // -------------------------------------------------------------

  @Get('teacher')
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Teacher cohort performance, retention, and quiz telemetry' })
  @ApiResponse({ status: 200, description: 'Teacher analytics returned' })
  async getTeacherAnalytics(
    @CurrentUser() caller: AuthenticatedUser,
    @Query() query: TeacherAnalyticsQueryDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.analyticsService.getTeacherAnalytics(caller.id, query, isSuperAdmin);
  }

  // -------------------------------------------------------------
  // 3. INSTITUTION ADMIN ANALYTICS
  // -------------------------------------------------------------

  @Get('institution')
  @Roles(Role.INSTITUTION_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Institution telemetry, student-faculty ratios, and departmental reports' })
  @ApiResponse({ status: 200, description: 'Institution analytics returned' })
  async getInstitutionAnalytics(
    @CurrentUser() caller: AuthenticatedUser,
    @Query() query: InstitutionAnalyticsQueryDto,
  ) {
    return this.analyticsService.getInstitutionAnalytics(caller, query);
  }

  // -------------------------------------------------------------
  // 4. SUPER ADMIN PLATFORM ANALYTICS
  // -------------------------------------------------------------

  @Get('platform')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Platform-wide telemetry, user growth, course catalogue, and audit throughput' })
  @ApiResponse({ status: 200, description: 'Platform analytics returned' })
  async getPlatformAnalytics(@Query() query: PlatformAnalyticsQueryDto) {
    return this.analyticsService.getPlatformAnalytics(query.days);
  }
}

