import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { InstitutionsService } from './institutions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { TenantInviteDto } from './dto/tenant-invite.dto';

@ApiTags('Institution Administration')
@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INSTITUTION_ADMIN, Role.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

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
  @ApiOperation({ summary: 'Dispatch faculty invitation to join this institution' })
  @ApiQuery({ name: 'institutionId', required: false })
  @ApiResponse({ status: 201, description: 'Invitation dispatched successfully' })
  async createInvitation(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: TenantInviteDto,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.institutionsService.createInvitation(caller, dto, institutionId);
  }
}

