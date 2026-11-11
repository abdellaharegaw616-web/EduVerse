import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';

@ApiTags('Course & Institutional Announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get announcements relevant to the authenticated user' })
  @ApiResponse({ status: 200, description: 'Announcements list returned' })
  async getMyAnnouncements(@CurrentUser('id') userId: string) {
    return this.announcementsService.getMyAnnouncements(userId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get announcements published for a specific course' })
  @ApiResponse({ status: 200, description: 'Course announcements returned' })
  async getCourseAnnouncements(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.announcementsService.getCourseAnnouncements(
      caller.id,
      caller.role,
      courseId,
    );
  }

  @Get('teacher')
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.INSTITUTION_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get announcements managed by the authenticated instructor/admin' })
  async getTeacherAnnouncements(@CurrentUser() caller: AuthenticatedUser) {
    return this.announcementsService.getTeacherAnnouncements(caller);
  }

  @Post()
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.INSTITUTION_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Publish an announcement and notify enrolled learners',
  })
  @ApiResponse({ status: 201, description: 'Announcement published' })
  async createAnnouncement(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.createAnnouncement(caller, dto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.INSTITUTION_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete an announcement authored by caller or SUPER_ADMIN' })
  async deleteAnnouncement(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.announcementsService.deleteAnnouncement(caller, id);
  }
}

