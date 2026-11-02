import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
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
}

