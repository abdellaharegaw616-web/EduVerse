import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';

import { CoursesService } from './courses.service';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Public Course Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('courses')
  @ApiOperation({
    summary: 'Search, filter, sort and paginate published courses in the marketplace',
  })
  @ApiResponse({ status: 200, description: 'Paginated published courses catalog' })
  async getMarketplaceCourses(@Query() query: MarketplaceQueryDto) {
    return this.coursesService.getMarketplaceCourses(query);
  }

  @Get('courses/:slug')
  @ApiOperation({
    summary: 'Get published course details by slug with curriculum and student reviews',
  })
  @ApiResponse({ status: 200, description: 'Course details returned' })
  @ApiResponse({ status: 404, description: 'Course not found or not published' })
  async getMarketplaceCourseDetails(
    @Param('slug') slug: string,
    @CurrentUser() caller?: AuthenticatedUser,
  ) {
    return this.coursesService.getMarketplaceCourseDetails(slug, caller?.id);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'List course categories with counts of published courses',
  })
  @ApiResponse({ status: 200, description: 'Categories list returned' })
  async getMarketplaceCategories() {
    return this.coursesService.getMarketplaceCategories();
  }

  @Get('instructors/:id')
  @ApiOperation({
    summary: 'Get public instructor profile, published courses, and student ratings',
  })
  @ApiResponse({ status: 200, description: 'Instructor profile returned' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  async getMarketplaceInstructor(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.getMarketplaceInstructor(id);
  }

  @Post('courses/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit or update a course review (Enrolled students only)',
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Must be enrolled to review' })
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.coursesService.createReview(user.id, courseId, dto);
  }
}

