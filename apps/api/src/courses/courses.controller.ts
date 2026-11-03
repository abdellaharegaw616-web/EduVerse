import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpsertQuizDto, CreateQuestionDto } from './dto/manage-quiz.dto';
import { UpsertAssignmentDto } from './dto/manage-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { CreateResourceDto } from './dto/create-resource.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../database/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

@ApiTags('Teacher Course Management & Studio')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.INDEPENDENT_INSTRUCTOR, Role.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // 1. Teacher Dashboard
  @Get('teacher/dashboard')
  @ApiOperation({ summary: 'Aggregated analytics and telemetry for teacher studio dashboard' })
  async getTeacherDashboard(@CurrentUser() caller: AuthenticatedUser) {
    return this.coursesService.getTeacherDashboard(caller.id);
  }

  // 2. My Courses List
  @Get('teacher/my')
  @ApiOperation({ summary: 'List courses authored by authenticated teacher' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by DRAFT, PENDING_REVIEW, PUBLISHED, ARCHIVED' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTeacherCourses(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coursesService.getTeacherCourses(caller.id, {
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // 3. Categories Dropdown List
  @Get('categories')
  @ApiOperation({ summary: 'List course categories for curriculum authoring' })
  async getCategories() {
    return this.coursesService.getCategories();
  }

  // 4. Create Course
  @Post('teacher')
  @ApiOperation({ summary: 'Draft a new course' })
  @ApiResponse({ status: 201, description: 'Course drafted successfully' })
  async createCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.createCourse(caller.id, dto);
  }

  // 5. Get Course Details
  @Get('teacher/:id')
  @ApiOperation({ summary: 'Get course curriculum tree with ownership verification' })
  async getCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.getCourseForTeacher(caller.id, id, isSuperAdmin);
  }

  // 6. Update Course
  @Patch('teacher/:id')
  @ApiOperation({ summary: 'Update course metadata, lifecycle status, or category' })
  async updateCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.updateCourse(caller.id, id, dto, isSuperAdmin);
  }

  // 7. Delete Course
  @Delete('teacher/:id')
  @ApiOperation({ summary: 'Delete a course (ownership verified)' })
  async deleteCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.deleteCourse(caller.id, id, isSuperAdmin);
  }

  // 8. Create Section
  @Post('teacher/:id/sections')
  @ApiOperation({ summary: 'Create curriculum module section' })
  async createSection(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.createSection(caller.id, courseId, dto, isSuperAdmin);
  }

  // 9. Update Section
  @Patch('teacher/sections/:sectionId')
  @ApiOperation({ summary: 'Update curriculum module section title or order' })
  async updateSection(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateSectionDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.updateSection(caller.id, sectionId, dto, isSuperAdmin);
  }

  // 10. Delete Section
  @Delete('teacher/sections/:sectionId')
  @ApiOperation({ summary: 'Delete curriculum module section' })
  async deleteSection(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.deleteSection(caller.id, sectionId, isSuperAdmin);
  }

  // 11. Create Lesson
  @Post('teacher/sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Create lesson inside a section' })
  async createLesson(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.createLesson(caller.id, sectionId, dto, isSuperAdmin);
  }

  // 12. Get Lesson
  @Get('teacher/lessons/:lessonId')
  @ApiOperation({ summary: 'Get lesson details for editing' })
  async getLesson(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.getLesson(caller.id, lessonId, isSuperAdmin);
  }

  // 13. Update Lesson
  @Patch('teacher/lessons/:lessonId')
  @ApiOperation({ summary: 'Update lesson notes, video, or duration' })
  async updateLesson(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateLessonDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.updateLesson(caller.id, lessonId, dto, isSuperAdmin);
  }

  // 14. Delete Lesson
  @Delete('teacher/lessons/:lessonId')
  @ApiOperation({ summary: 'Delete lesson' })
  async deleteLesson(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.deleteLesson(caller.id, lessonId, isSuperAdmin);
  }

  // 15. Upsert Quiz
  @Post('teacher/lessons/:lessonId/quiz')
  @ApiOperation({ summary: 'Create or update quiz for a lesson' })
  async upsertQuiz(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpsertQuizDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.upsertQuiz(caller.id, lessonId, dto, isSuperAdmin);
  }

  // 16. Get Quiz
  @Get('teacher/quizzes/:quizId')
  @ApiOperation({ summary: 'Get quiz with question options' })
  async getQuiz(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.getQuiz(caller.id, quizId, isSuperAdmin);
  }

  // 17. Add Question
  @Post('teacher/quizzes/:quizId/questions')
  @ApiOperation({ summary: 'Add question to quiz' })
  async createQuestion(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.createQuestion(caller.id, quizId, dto, isSuperAdmin);
  }

  // 18. Delete Question
  @Delete('teacher/questions/:questionId')
  @ApiOperation({ summary: 'Delete question' })
  async deleteQuestion(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.deleteQuestion(caller.id, questionId, isSuperAdmin);
  }

  // 19. Upsert Assignment
  @Post('teacher/lessons/:lessonId/assignment')
  @ApiOperation({ summary: 'Create or update assignment for a lesson' })
  async upsertAssignment(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpsertAssignmentDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.upsertAssignment(caller.id, lessonId, dto, isSuperAdmin);
  }

  // 20. Get Submissions Across Teacher Courses
  @Get('teacher/assignments/submissions')
  @ApiOperation({ summary: 'List student submissions awaiting review across teacher courses' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by PENDING, GRADED, ALL' })
  async getSubmissions(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.coursesService.getTeacherSubmissions(caller.id, status);
  }

  // 21. Grade Submission
  @Patch('teacher/assignments/submissions/:submissionId/grade')
  @ApiOperation({ summary: 'Grade a student submission with score and qualitative feedback' })
  async gradeSubmission(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.gradeSubmission(caller.id, submissionId, dto, isSuperAdmin);
  }

  // 22. Course Students List
  @Get('teacher/:id/students')
  @ApiOperation({ summary: 'List enrolled students and learning telemetry for course' })
  async getCourseStudents(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.getCourseStudents(caller.id, courseId, isSuperAdmin);
  }

  // 23. Course Analytics
  @Get('teacher/:id/analytics')
  @ApiOperation({ summary: 'Detailed completion and assessment analytics for course' })
  async getCourseAnalytics(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.getCourseAnalytics(caller.id, courseId, isSuperAdmin);
  }

  // 24. Submit Course for Moderation Review
  @Post('teacher/:id/submit-for-review')
  @ApiOperation({ summary: 'Submit drafted course for quality and content review' })
  @ApiResponse({ status: 200, description: 'Course status updated to PENDING_REVIEW' })
  @ApiResponse({ status: 400, description: 'Validation failed: must contain sections and lessons' })
  async submitForReview(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.submitCourseForReview(caller.id, courseId, isSuperAdmin);
  }

  // 25. Publish Course (Instructor / Super Admin)
  @Post('teacher/:id/publish')
  @ApiOperation({ summary: 'Publish course to the public marketplace' })
  @ApiResponse({ status: 200, description: 'Course published successfully' })
  async publishCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.publishCourse(caller.id, courseId, isSuperAdmin);
  }

  // 26. Archive Course
  @Post('teacher/:id/archive')
  @ApiOperation({ summary: 'Archive course from active listings' })
  @ApiResponse({ status: 200, description: 'Course archived successfully' })
  async archiveCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.archiveCourse(caller.id, courseId, isSuperAdmin);
  }

  // 27. Add Resource to Lesson
  @Post('teacher/lessons/:lessonId/resources')
  @ApiOperation({ summary: 'Attach a downloadable or external resource to a lesson' })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  async addLessonResource(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateResourceDto,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.addLessonResource(caller.id, lessonId, dto, isSuperAdmin);
  }

  // 28. Delete Resource from Lesson
  @Delete('teacher/resources/:resourceId')
  @ApiOperation({ summary: 'Remove a resource from a lesson' })
  @ApiResponse({ status: 200, description: 'Resource removed successfully' })
  async deleteLessonResource(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ) {
    const isSuperAdmin = caller.role === Role.SUPER_ADMIN;
    return this.coursesService.deleteLessonResource(caller.id, resourceId, isSuperAdmin);
  }

  // 29. Free Course Enrollment (Any Authenticated Student or User)
  @Post(':id/enroll')
  @Roles(
    Role.STUDENT,
    Role.TEACHER,
    Role.INDEPENDENT_INSTRUCTOR,
    Role.INSTITUTION_ADMIN,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Enroll in a published free course' })
  @ApiResponse({ status: 201, description: 'Successfully enrolled' })
  @ApiResponse({ status: 400, description: 'Cannot enroll in unpublished course' })
  @ApiResponse({ status: 409, description: 'Already enrolled in course' })
  async enrollInCourse(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
  ) {
    return this.enrollmentsService.enrollInCourse(caller.id, courseId);
  }

  // 30. Verify Course Content Authorization
  @Get(':id/access')
  @Roles(
    Role.STUDENT,
    Role.TEACHER,
    Role.INDEPENDENT_INSTRUCTOR,
    Role.INSTITUTION_ADMIN,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Verify student authorization to access course content' })
  async checkCourseAccess(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) courseId: string,
  ) {
    return this.enrollmentsService.checkCourseAccess(caller.id, courseId);
  }
}

