import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preferences.dto';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get all notifications for authenticated user with optional filters' })
  @ApiResponse({ status: 200, description: 'List of notifications returned' })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getMyNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread notifications count for current user' })
  @ApiResponse({ status: 200, description: 'Unread notifications count returned' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read (verifies ownership)' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found or access denied' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single notification (verifies ownership)' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification successfully deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found or access denied' })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.deleteNotification(userId, id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification delivery preferences for current user' })
  @ApiResponse({ status: 200, description: 'Notification preferences returned' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification delivery preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences updated' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  @Post('dispatch')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @ApiOperation({ summary: 'Dispatch a targeted notification (Super Admin / Institution Admin)' })
  @ApiResponse({ status: 201, description: 'Notification dispatched' })
  async dispatchNotification(@Body() dto: DispatchNotificationDto) {
    return this.notificationsService.dispatch(dto);
  }
}
