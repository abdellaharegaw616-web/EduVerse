import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';

@ApiTags('User Management & Roles')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile and institutional memberships' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update personal profile details and avatar URL' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List user directory (SUPER_ADMIN or INSTITUTION_ADMIN)' })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  async listUsers(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    return this.usersService.listUsers(caller, { role, search });
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign user role (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires SUPER_ADMIN' })
  async updateUserRole(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateUserRole(adminUser, targetUserId, dto.role);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Suspend or reactivate user account (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires SUPER_ADMIN' })
  async setUserStatus(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.usersService.setUserStatus(adminUser, targetUserId, dto);
  }

  @Post('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Invite a faculty member or institutional admin' })
  @ApiResponse({ status: 201, description: 'Invitation created and dispatched' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cannot invite without admin role' })
  async createInvitation(
    @CurrentUser() inviter: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.usersService.createInvitation(inviter, dto);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept faculty/admin invitation and activate account' })
  @ApiResponse({ status: 200, description: 'Invitation accepted, account created' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation token' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.usersService.acceptInvitation(dto);
  }
}

