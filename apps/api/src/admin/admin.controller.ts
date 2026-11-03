import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role, CourseStatus } from '../database/prisma.service';

import { ModerateCourseDto } from './dto/moderate-course.dto';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('Super Admin Administration')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform KPI overview, user metrics, and system status' })
  @ApiResponse({ status: 200, description: 'Platform metrics returned' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires SUPER_ADMIN' })
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Platform-wide growth, category breakdowns, and completion rates' })
  @ApiResponse({ status: 200, description: 'Platform analytics returned' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Inspect paginated system audit trail with filters' })
  @ApiResponse({ status: 200, description: 'Audit trail records returned' })
  async getAuditLogs(@Query() query: AuditQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('courses/moderation')
  @ApiOperation({ summary: 'List courses submitted for administrative moderation' })
  @ApiQuery({ name: 'status', enum: CourseStatus, required: false })
  @ApiResponse({ status: 200, description: 'Courses for moderation returned' })
  async getCoursesForModeration(@Query('status') status?: CourseStatus) {
    return this.adminService.getCoursesForModeration(status);
  }

  @Patch('courses/:id/moderation')
  @ApiOperation({ summary: 'Approve or reject a course with author notification' })
  @ApiResponse({ status: 200, description: 'Course moderation decision applied' })
  async moderateCourse(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() dto: ModerateCourseDto,
  ) {
    return this.adminService.moderateCourse(admin.id, courseId, dto);
  }

  @Get('institutions')
  @ApiOperation({ summary: 'List all university and institutional tenants' })
  @ApiResponse({ status: 200, description: 'Institutions list returned' })
  async getInstitutions() {
    return this.adminService.getInstitutions();
  }

  @Post('institutions')
  @ApiOperation({ summary: 'Create a new institutional tenant' })
  @ApiResponse({ status: 201, description: 'Institution created successfully' })
  async createInstitution(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateInstitutionDto,
  ) {
    return this.adminService.createInstitution(admin.id, dto);
  }

  @Patch('institutions/:id')
  @ApiOperation({ summary: 'Update institutional tenant configuration' })
  @ApiResponse({ status: 200, description: 'Institution updated successfully' })
  async updateInstitution(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.adminService.updateInstitution(admin.id, id, dto);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get global platform runtime configuration' })
  @ApiResponse({ status: 200, description: 'Settings returned' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update global platform runtime configuration' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.adminService.updateSettings(admin.id, dto);
  }
}

