import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AiService } from './ai.service';
import { AskTutorDto } from './dto/ask-tutor.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { DraftFeedbackDto } from './dto/draft-feedback.dto';
import { GenerateOutlineDto } from './dto/generate-outline.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';

@ApiTags('AI Academic Assistant & Authoring Tools')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @ApiOperation({ summary: 'Retrieve active AI engine mode and provider availability' })
  @ApiResponse({ status: 200, description: 'AI engine capabilities returned' })
  getStatus() {
    return this.aiService.getStatus();
  }

  @Post('tutor/ask')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Ask the EduVerse AI Study Tutor grounded in course/lesson material',
  })
  @ApiResponse({ status: 200, description: 'Study assistant reply generated and saved' })
  @ApiResponse({ status: 403, description: 'Not enrolled or account suspended' })
  async askTutor(
    @CurrentUser('id') userId: string,
    @Body() dto: AskTutorDto,
  ) {
    return this.aiService.askTutor(userId, dto);
  }

  @Get('tutor/history')
  @ApiOperation({ summary: 'Retrieve persisted AI Study Tutor conversation history' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'lessonId', required: false })
  async getTutorHistory(
    @CurrentUser('id') userId: string,
    @Query('courseId') courseId?: string,
    @Query('lessonId') lessonId?: string,
  ) {
    return this.aiService.getTutorHistory(userId, courseId, lessonId);
  }

  @Delete('tutor/history')
  @ApiOperation({ summary: 'Clear AI Study Tutor conversation history for a user or lesson' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'lessonId', required: false })
  async clearTutorHistory(
    @CurrentUser('id') userId: string,
    @Query('courseId') courseId?: string,
    @Query('lessonId') lessonId?: string,
  ) {
    return this.aiService.clearTutorHistory(userId, courseId, lessonId);
  }

  @Post('teacher/generate-quiz')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate draft multiple-choice quiz questions from lesson content' })
  @ApiResponse({ status: 200, description: 'Draft quiz questions returned' })
  async generateQuiz(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: GenerateQuizDto,
  ) {
    return this.aiService.generateQuizQuestions(
      caller.id,
      caller.role === Role.SUPER_ADMIN,
      dto,
    );
  }

  @Post('teacher/draft-feedback')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Draft constructive assignment feedback based on submission and score' })
  @ApiResponse({ status: 200, description: 'Draft feedback generated' })
  async draftFeedback(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: DraftFeedbackDto,
  ) {
    return this.aiService.draftAssignmentFeedback(
      caller.id,
      caller.role === Role.SUPER_ADMIN,
      dto,
    );
  }

  @Post('teacher/generate-outline')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate structured course outline and objectives from a topic' })
  @ApiResponse({ status: 200, description: 'Course outline generated' })
  async generateOutline(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateOutlineDto,
  ) {
    return this.aiService.generateCourseOutline(userId, dto);
  }
}

