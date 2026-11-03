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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { InstitutionsService } from './institutions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { TenantInviteDto } from './dto/tenant-invite.dto';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';
import { AssignCourseDto } from './dto/assign-course.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('Institution Administration')
@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INSTITUTION_ADMIN, Role.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  // -------------------------------------------------------------
  // 1. OVERVIEW & PROFILE
  // -------------------------------------------------------------

  @Get('my/overview')
  @ApiOperation({ summary: 'Tenant overview, academic counts, and institution details' })
  @ApiQuery({ name: 'institutionId', required: false, description: 'Tenant override (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant overview returned' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires INSTITUTION_ADMIN or SUPER_ADMIN' })
  async getOverview(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getOverview(caller, institutionId);
  }

  @Get('my/profile')
  @ApiOperation({ summary: 'Get caller institution profile' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Institution profile returned' })
  async getProfile(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getProfile(caller, institutionId);
  }

  @Patch('my/profile')
  @ApiOperation({ summary: 'Update institution profile metadata' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Institution profile updated successfully' })
  async updateProfile(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: UpdateInstitutionProfileDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.updateProfile(caller, dto, institutionId);
  }

  // -------------------------------------------------------------
  // 2. MEMBERSHIP MANAGEMENT
  // -------------------------------------------------------------

  @Get('my/members')
  @ApiOperation({ summary: 'List all institution members with optional role filter' })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Institution members list returned' })
  async getMembers(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getMembers(caller, { role, search }, institutionId);
  }

  @Patch('my/members/:memberId/role')
  @ApiOperation({ summary: 'Update an institution member role' })
  @ApiParam({ name: 'memberId', description: 'Institution membership ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  async updateMemberRole(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.updateMemberRole(caller, memberId, dto, institutionId);
  }

  @Delete('my/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the institution' })
  @ApiParam({ name: 'memberId', description: 'Institution membership ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  async removeMember(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.removeMember(caller, memberId, institutionId);
  }

  @Get('my/teachers')
  @ApiOperation({ summary: 'List faculty members belonging to caller institution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Teacher list returned' })
  async getTeachers(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getTeachers(caller, institutionId);
  }

  @Get('my/students')
  @ApiOperation({ summary: 'List students enrolled in caller institution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Student list returned' })
  async getStudents(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getStudents(caller, institutionId);
  }

  // -------------------------------------------------------------
  // 3. DEPARTMENTS
  // -------------------------------------------------------------

  @Get('my/departments')
  @ApiOperation({ summary: 'List academic departments in caller institution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Department list returned' })
  async getDepartments(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getDepartments(caller, institutionId);
  }

  @Get('my/departments/:id')
  @ApiOperation({ summary: 'Get academic department details' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Department details returned' })
  async getDepartment(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getDepartment(caller, id, institutionId);
  }

  @Post('my/departments')
  @ApiOperation({ summary: 'Create a new academic department' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  async createDepartment(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CreateDepartmentDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.createDepartment(caller, dto, institutionId);
  }

  @Patch('my/departments/:id')
  @ApiOperation({ summary: 'Update an existing academic department' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  async updateDepartment(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.updateDepartment(caller, id, dto, institutionId);
  }

  @Delete('my/departments/:id')
  @ApiOperation({ summary: 'Delete an academic department' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Department deleted successfully' })
  async deleteDepartment(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.deleteDepartment(caller, id, institutionId);
  }

  // -------------------------------------------------------------
  // 4. CLASSES
  // -------------------------------------------------------------

  @Get('my/classes')
  @ApiOperation({ summary: 'List academic classes and assigned faculty' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Classes list returned' })
  async getClasses(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getClasses(caller, institutionId);
  }

  @Get('my/classes/:id')
  @ApiOperation({ summary: 'Get class details and enrollments count' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Class details returned' })
  async getClass(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getClass(caller, id, institutionId);
  }

  @Post('my/classes')
  @ApiOperation({ summary: 'Create a new class section in a department' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  async createClass(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CreateClassDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.createClass(caller, dto, institutionId);
  }

  @Patch('my/classes/:id')
  @ApiOperation({ summary: 'Update an existing class section' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  async updateClass(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.updateClass(caller, id, dto, institutionId);
  }

  @Delete('my/classes/:id')
  @ApiOperation({ summary: 'Delete a class section' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  async deleteClass(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.deleteClass(caller, id, institutionId);
  }

  // -------------------------------------------------------------
  // 5. ACADEMIC PROGRAMS & INSTITUTION COURSE MANAGEMENT
  // -------------------------------------------------------------

  @Get('my/courses')
  @ApiOperation({ summary: 'List courses affiliated with this institution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Institution courses returned' })
  async getCourses(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getCourses(caller, institutionId);
  }

  @Post('my/courses/:courseId/assign')
  @ApiOperation({ summary: 'Assign a course to the caller institution and optionally a department' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Course assigned to institution' })
  async assignCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() dto: AssignCourseDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.assignCourse(caller, courseId, dto, institutionId);
  }

  @Delete('my/courses/:courseId/unassign')
  @ApiOperation({ summary: 'Unassign a course from this institution' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Course unassigned from institution' })
  async unassignCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.unassignCourse(caller, courseId, institutionId);
  }

  // -------------------------------------------------------------
  // 6. INVITATIONS & REPORTS
  // -------------------------------------------------------------

  @Get('my/invitations')
  @ApiOperation({ summary: 'List active and accepted invitations for this institution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Invitations list returned' })
  async getInvitations(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getInvitations(caller, institutionId);
  }

  @Post('my/invitations')
  @ApiOperation({ summary: 'Dispatch faculty or student invitation to join this institution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 201, description: 'Invitation dispatched successfully' })
  async createInvitation(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: TenantInviteDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.createInvitation(caller, dto, institutionId);
  }

  @Get('my/reports')
  @ApiOperation({ summary: 'Academic reports, class capacity, and department distribution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 200, description: 'Institution report returned' })
  async getReports(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.getReports(caller, institutionId);
  }
}
