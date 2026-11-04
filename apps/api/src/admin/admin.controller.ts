import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { SuspendUserAdminDto } from './dto/suspend-user-admin.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ContentModerationDto } from './dto/content-moderation.dto';

@ApiTags('Super Admin Administration & Moderation')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // -------------------------------------------------------------
  // 1. KPI OVERVIEW & ANALYTICS
  // -------------------------------------------------------------

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

  // -------------------------------------------------------------
  // 2. USER MODERATION (SUSPEND & REACTIVATE)
  // -------------------------------------------------------------

  @Get('users')
  @ApiOperation({ summary: 'List and filter users for administrative inspection' })
  @ApiResponse({ status: 200, description: 'Paginated user list returned' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Retrieve comprehensive user profile and activity summary' })
  @ApiResponse({ status: 200, description: 'User details returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Suspend or reactivate a user account with required reason and session revocation' })
  @ApiResponse({ status: 200, description: 'User account status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cannot suspend root Super Admin' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setUserStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserAdminDto,
  ) {
    return this.adminService.setUserStatus(admin.id, id, dto);
  }

  // -------------------------------------------------------------
  // 3. COURSE MODERATION & REVIEW WORKFLOW
  // -------------------------------------------------------------

  @Get('courses/moderation')
  @ApiOperation({ summary: 'List courses submitted for administrative moderation' })
  @ApiQuery({ name: 'status', enum: CourseStatus, required: false })
  @ApiResponse({ status: 200, description: 'Courses for moderation returned' })
  async getCoursesForModeration(@Query('status') status?: CourseStatus) {
    return this.adminService.getCoursesForModeration(status);
  }

  @Get('courses/:id/review')
  @ApiOperation({ summary: 'Inspect complete course curriculum and materials for moderation' })
  @ApiResponse({ status: 200, description: 'Course review payload returned' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseForReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getCourseForReview(id);
  }

  @Patch('courses/:id/moderation')
  @ApiOperation({ summary: 'Approve or reject a course with feedback/reason and author notification' })
  @ApiResponse({ status: 200, description: 'Course moderation decision applied' })
  @ApiResponse({ status: 400, description: 'Bad Request: Missing rejection reason' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async moderateCourse(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() dto: ModerateCourseDto,
  ) {
    return this.adminService.moderateCourse(admin.id, courseId, dto);
  }

  // -------------------------------------------------------------
  // 4. CONTENT MODERATION (REVIEWS & COMMENTS)
  // -------------------------------------------------------------

  @Get('moderation/reviews')
  @ApiOperation({ summary: 'List user reviews for content moderation' })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  async getReviewsForModeration(
    @Query('courseId') courseId?: string,
    @Query('rating') rating?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getReviewsForModeration({ courseId, rating, page, limit });
  }

  @Delete('moderation/reviews/:id')
  @ApiOperation({ summary: 'Remove inappropriate user review with recorded moderation reason' })
  @ApiResponse({ status: 200, description: 'Review removed successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async moderateReview(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContentModerationDto,
  ) {
    return this.adminService.moderateReview(admin.id, id, dto);
  }

  // -------------------------------------------------------------
  // 5. INSTITUTION ADMINISTRATION
  // -------------------------------------------------------------

  @Get('institutions')
  @ApiOperation({ summary: 'List all university and institutional tenants' })
  @ApiResponse({ status: 200, description: 'Institutions list returned' })
  async getInstitutions() {
    return this.adminService.getInstitutions();
  }

  @Get('institutions/:id')
  @ApiOperation({ summary: 'Get institution profile details and department structure' })
  @ApiResponse({ status: 200, description: 'Institution details returned' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  async getInstitutionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getInstitutionById(id);
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

  @Patch('institutions/:id/status')
  @ApiOperation({ summary: 'Activate or suspend an institutional tenant' })
  @ApiResponse({ status: 200, description: 'Institution status updated' })
  async setInstitutionStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.setInstitutionStatus(admin.id, id, isActive, reason);
  }

  // -------------------------------------------------------------
  // 6. GLOBAL PLATFORM SETTINGS
  // -------------------------------------------------------------

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

  // -------------------------------------------------------------
  // 7. AUDIT TRAIL INSPECTION (IMMUTABLE AUDIT LOGS)
  // -------------------------------------------------------------

  @Get('audit-logs')
  @ApiOperation({ summary: 'Inspect paginated system audit trail with filters' })
  @ApiResponse({ status: 200, description: 'Audit trail records returned' })
  async getAuditLogs(@Query() query: AuditQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('audit-logs/:id')
  @ApiOperation({ summary: 'Inspect a specific audit record with safe metadata and actor attribution' })
  @ApiResponse({ status: 200, description: 'Audit log record returned' })
  @ApiResponse({ status: 404, description: 'Audit log record not found' })
  async getAuditLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getAuditLogById(id);
  }
}
