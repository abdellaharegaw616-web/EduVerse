import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get all assignments for enrolled courses with student submission status' })
  @ApiResponse({ status: 200, description: 'List of student assignments returned' })
  async getMyAssignments(@CurrentUser('id') userId: string) {
    return this.assignmentsService.getMyAssignments(userId);
  }
}

