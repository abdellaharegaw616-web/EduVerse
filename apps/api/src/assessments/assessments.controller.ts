import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Assessments & Quizzes')
@Controller('assessments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get('my/quizzes')
  @ApiOperation({ summary: 'Get all quiz attempts and results for authenticated student' })
  @ApiResponse({ status: 200, description: 'List of student quiz attempts' })
  async getMyQuizzes(@CurrentUser('id') userId: string) {
    return this.assessmentsService.getMyQuizzes(userId);
  }

  @Get('quizzes/:quizId')
  @ApiOperation({ summary: 'Get quiz questions without correct answers for student examination' })
  @ApiResponse({ status: 200, description: 'Quiz questions retrieved' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course or account suspended' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async getQuiz(
    @CurrentUser('id') userId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ) {
    return this.assessmentsService.getQuizForStudent(userId, quizId);
  }

  @Post('quizzes/:quizId/submit')
  @ApiOperation({ summary: 'Submit quiz answers for automatic backend grading' })
  @ApiResponse({ status: 200, description: 'Quiz graded and results recorded' })
  @ApiResponse({ status: 400, description: 'Attempt limit exceeded, time expired, or invalid submission' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  async submitQuiz(
    @CurrentUser('id') userId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.assessmentsService.submitQuiz(userId, quizId, dto);
  }

  @Get('quizzes/:quizId/attempts')
  @ApiOperation({ summary: 'Get past attempts and scores for a specific quiz' })
  @ApiResponse({ status: 200, description: 'Quiz attempts retrieved' })
  async getQuizAttempts(
    @CurrentUser('id') userId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ) {
    return this.assessmentsService.getQuizAttempts(userId, quizId);
  }

  @Get('attempts/:attemptId')
  @ApiOperation({ summary: 'Get specific graded attempt details' })
  @ApiResponse({ status: 200, description: 'Attempt details retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden: Attempt belongs to another user' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  async getAttemptDetails(
    @CurrentUser('id') userId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.assessmentsService.getAttemptDetails(userId, attemptId);
  }
}
