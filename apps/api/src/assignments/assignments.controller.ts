import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeAssignmentDto } from './dto/grade-assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../database/prisma.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Assignments & Homework Management')
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // 1. Student: My Enrolled Assignments
  @Get('my')
  @Roles(Role.STUDENT, Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all assignments for enrolled courses with student submission standing' })
  @ApiResponse({ status: 200, description: 'List of student assignments returned' })
  async getMyAssignments(@CurrentUser('id') userId: string) {
    return this.assignmentsService.getMyAssignments(userId);
  }

  // 2. Student & Teacher: Assignment Details
  @Get(':id')
  @Roles(Role.STUDENT, Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get specific assignment details, instructions, rubric, and submission status' })
  @ApiResponse({ status: 200, description: 'Assignment details returned' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not enrolled in course' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async getAssignmentDetails(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignmentsService.getAssignmentDetails(userId, assignmentId);
  }

  // 3. Student: Submit Assignment
  @Post(':id/submit')
  @Roles(Role.STUDENT, Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit written content or attached file for assignment' })
  @ApiResponse({ status: 201, description: 'Assignment successfully submitted' })
  @ApiResponse({ status: 400, description: 'Deadline expired, invalid file type/size, or already graded' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  async submitAssignment(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignmentsService.submitAssignment(userId, assignmentId, dto);
  }

  // 4. Student & Teacher: Submission Details & Feedback
  @Get('submissions/:submissionId')
  @Roles(Role.STUDENT, Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get submission details, awarded grade, and instructor feedback' })
  @ApiResponse({ status: 200, description: 'Submission details returned' })
  @ApiResponse({ status: 403, description: 'Forbidden: Unauthorized access to submission' })
  async getSubmissionDetails(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.assignmentsService.getSubmissionDetails(caller.id, submissionId, isSuperAdmin);
  }

  // 5. Teacher: List Course Submissions
  @Get('teacher/submissions')
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all submissions for teacher courses' })
  @ApiQuery({ name: 'status', required: false, enum: ['ALL', 'PENDING', 'GRADED', 'RETURNED'] })
  @ApiResponse({ status: 200, description: 'List of submissions for grading' })
  async getTeacherSubmissions(
    @CurrentUser('id') teacherId: string,
    @Query('status') status?: string,
  ) {
    return this.assignmentsService.getTeacherSubmissions(teacherId, status);
  }

  // 6. Teacher: Grade Student Submission
  @Post('submissions/:submissionId/grade')
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Award grade and qualitative feedback to student submission' })
  @ApiResponse({ status: 200, description: 'Submission graded successfully' })
  @ApiResponse({ status: 400, description: 'Grade exceeds assignment maxScore' })
  @ApiResponse({ status: 403, description: 'Forbidden: Caller is not course author' })
  async gradeSubmission(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeAssignmentDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.assignmentsService.gradeSubmission(caller.id, submissionId, dto, isSuperAdmin);
  }

  // 7. Teacher: Upsert Lesson Assignment
  @Post('lessons/:lessonId')
  @Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create or update assignment for a lesson' })
  @ApiResponse({ status: 201, description: 'Assignment upserted' })
  @ApiResponse({ status: 403, description: 'Forbidden: Caller is not course author' })
  async upsertAssignment(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.assignmentsService.upsertAssignment(caller.id, lessonId, dto, isSuperAdmin);
  }
}
