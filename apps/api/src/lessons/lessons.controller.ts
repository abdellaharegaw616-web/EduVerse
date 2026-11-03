import {
  Controller,
  Get,
  Post,
  Delete,
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
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Student Learning Experience & Player')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Get lesson content and navigation for student player' })
  @ApiResponse({ status: 200, description: 'Lesson content retrieved' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course or account suspended' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async getLesson(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) lessonId: string,
  ) {
    return this.lessonsService.getLessonForStudent(userId, lessonId);
  }

  @Post('lessons/:id/complete')
  @ApiOperation({ summary: 'Mark lesson complete and recalculate course progress' })
  @ApiResponse({ status: 200, description: 'Lesson marked complete' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course or account suspended' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async completeLesson(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) lessonId: string,
  ) {
    return this.lessonsService.completeLesson(userId, lessonId);
  }

  @Delete('lessons/:id/complete')
  @ApiOperation({ summary: 'Unmark lesson completion and adjust progress' })
  @ApiResponse({ status: 200, description: 'Lesson unmarked' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  async uncompleteLesson(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) lessonId: string,
  ) {
    return this.lessonsService.uncompleteLesson(userId, lessonId);
  }

  @Get('courses/:courseIdentifier/player')
  @ApiOperation({ summary: 'Get course player syllabus, completion indicators, and bookmark' })
  @ApiResponse({ status: 200, description: 'Course player syllabus retrieved' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  async getCoursePlayer(
    @CurrentUser('id') userId: string,
    @Param('courseIdentifier') courseIdentifier: string,
  ) {
    return this.lessonsService.getCoursePlayer(userId, courseIdentifier);
  }

  @Get('courses/:courseIdentifier/resume')
  @ApiOperation({ summary: 'Get resume learning bookmark lesson' })
  @ApiResponse({ status: 200, description: 'Resume bookmark retrieved' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  async getResumeLesson(
    @CurrentUser('id') userId: string,
    @Param('courseIdentifier') courseIdentifier: string,
  ) {
    return this.lessonsService.getResumeLesson(userId, courseIdentifier);
  }
}

