import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Enrollments & Student Learning')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('my/dashboard')
  @ApiOperation({ summary: 'Get aggregated student learning dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics and recent items retrieved' })
  async getMyDashboard(@CurrentUser('id') userId: string) {
    return this.enrollmentsService.getMyDashboard(userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get paginated enrolled courses for student' })
  @ApiQuery({ name: 'status', enum: ['all', 'in-progress', 'completed'], required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getMyEnrollments(
    @CurrentUser('id') userId: string,
    @Query('status') status?: 'all' | 'in-progress' | 'completed',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.enrollmentsService.getMyEnrollments(userId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('my/progress')
  @ApiOperation({ summary: 'Get detailed learning progress breakdown for all enrolled courses' })
  async getMyProgress(@CurrentUser('id') userId: string) {
    return this.enrollmentsService.getMyProgress(userId);
  }

  @Get('my/recent-lessons')
  @ApiOperation({ summary: 'Get recently accessed and completed lessons' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getMyRecentLessons(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.enrollmentsService.getMyRecentLessons(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}

