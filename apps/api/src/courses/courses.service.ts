import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService, CourseStatus, CourseDifficulty, LessonType } from '../database/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { MarketplaceQueryDto, MarketplaceSortBy } from './dto/marketplace-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpsertQuizDto, CreateQuestionDto } from './dto/manage-quiz.dto';
import { UpsertAssignmentDto } from './dto/manage-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // 1. Teacher Dashboard Statistics
  async getTeacherDashboard(teacherId: string) {
    const courses = await this.prisma.course.findMany({
      where: { authorId: teacherId },
      include: {
        enrollments: { select: { id: true, progressPercentage: true, completedAt: true } },
        sections: {
          include: {
            lessons: {
              select: {
                id: true,
                assignment: {
                  select: {
                    submissions: {
                      where: { status: 'PENDING' },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalCourses = courses.length;
    const publishedCount = courses.filter((c) => c.status === CourseStatus.PUBLISHED).length;
    const draftCount = courses.filter((c) => c.status === CourseStatus.DRAFT).length;
    const pendingReviewCount = courses.filter((c) => c.status === CourseStatus.PENDING_REVIEW).length;

    let totalStudents = 0;
    let pendingSubmissionsCount = 0;

    courses.forEach((c) => {
      totalStudents += c.enrollments.length;
      c.sections.forEach((sec) => {
        sec.lessons.forEach((l) => {
          if (l.assignment) {
            pendingSubmissionsCount += l.assignment.submissions.length;
          }
        });
      });
    });

    // Recent student enrollments in teacher's courses
    const recentEnrollments = await this.prisma.enrollment.findMany({
      where: { course: { authorId: teacherId } },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { enrolledAt: 'desc' },
      take: 5,
    });

    // Recent pending submissions in teacher's courses
    const recentSubmissions = await this.prisma.assignmentSubmission.findMany({
      where: {
        assignment: {
          lesson: {
            section: { course: { authorId: teacherId } },
          },
        },
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            lesson: {
              select: {
                title: true,
                section: { select: { course: { select: { title: true, slug: true } } } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    });

    // Course performance overview
    const coursePerformance = courses.map((c) => {
      const studentCount = c.enrollments.length;
      const completedCount = c.enrollments.filter((e) => e.completedAt !== null).length;
      const avgProgress =
        studentCount > 0
          ? Math.round(
              c.enrollments.reduce((acc, curr) => acc + curr.progressPercentage, 0) /
                studentCount,
            )
          : 0;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        studentCount,
        completedCount,
        averageProgress: avgProgress,
        updatedAt: c.updatedAt,
      };
    });

    return {
      stats: {
        totalCourses,
        publishedCount,
        draftCount,
        pendingReviewCount,
        totalStudents,
        pendingSubmissionsCount,
      },
      courses: coursePerformance,
      recentEnrollments,
      recentSubmissions,
    };
  }

  // 2. Paginated Teacher Courses
  async getTeacherCourses(
    teacherId: string,
    query: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { authorId: teacherId };

    if (query.status && query.status !== 'all') {
      const upper = query.status.toUpperCase();
      if (Object.values(CourseStatus).includes(upper as CourseStatus)) {
        where.status = upper;
      }
    }

    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [total, courses] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: {
          category: { select: { name: true } },
          _count: {
            select: {
              enrollments: true,
              sections: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: courses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        status: c.status,
        categoryName: c.category?.name || 'Uncategorized',
        studentCount: c._count.enrollments,
        sectionCount: c._count.sections,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 3. Create Course
  async createCourse(teacherId: string, dto: CreateCourseDto) {
    let slug = this.slugify(dto.title);
    const existing = await this.prisma.course.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    return this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        slug,
        description: dto.description.trim(),
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        language: dto.language || 'English',
        difficulty: dto.difficulty || CourseDifficulty.BEGINNER,
        learningObjectives: dto.learningObjectives || [],
        prerequisites: dto.prerequisites || [],
        estimatedHours: dto.estimatedHours || 10,
        status: CourseStatus.DRAFT,
        authorId: teacherId,
        categoryId: dto.categoryId || null,
        departmentId: dto.departmentId || null,
        institutionId: dto.institutionId || null,
      },
      include: {
        category: true,
      },
    });
  }

  // 4. Get Course for Editing (Strict Ownership Verification)
  async getCourseForTeacher(teacherId: string, courseId: string, isSuperAdmin = false) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        department: true,
        institution: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                quiz: { select: { id: true, title: true, passingScore: true } },
                assignment: { select: { id: true, title: true, maxScore: true, dueDate: true } },
              },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!isSuperAdmin && course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage this course');
    }

    return course;
  }

  // 5. Update Course (Strict Ownership Verification)
  async updateCourse(
    teacherId: string,
    courseId: string,
    dto: UpdateCourseDto,
    isSuperAdmin = false,
  ) {
    await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    const updateData: any = {};
    if (dto.title) {
      updateData.title = dto.title.trim();
    }
    if (dto.description) {
      updateData.description = dto.description.trim();
    }
    if (dto.status) {
      updateData.status = dto.status;
    }
    if (dto.thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    }
    if (dto.language) {
      updateData.language = dto.language;
    }
    if (dto.difficulty) {
      updateData.difficulty = dto.difficulty;
    }
    if (dto.learningObjectives) {
      updateData.learningObjectives = dto.learningObjectives;
    }
    if (dto.prerequisites) {
      updateData.prerequisites = dto.prerequisites;
    }
    if (dto.estimatedHours !== undefined) {
      updateData.estimatedHours = dto.estimatedHours;
    }
    if (dto.categoryId !== undefined) {
      updateData.categoryId = dto.categoryId || null;
    }
    if (dto.departmentId !== undefined) {
      updateData.departmentId = dto.departmentId || null;
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: updateData,
      include: { category: true },
    });
  }

  // 6. Delete Course (Strict Ownership Verification)
  async deleteCourse(teacherId: string, courseId: string, isSuperAdmin = false) {
    await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    return this.prisma.course.delete({
      where: { id: courseId },
    });
  }

  // 7. Create Section
  async createSection(
    teacherId: string,
    courseId: string,
    dto: CreateSectionDto,
    isSuperAdmin = false,
  ) {
    await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    return this.prisma.courseSection.create({
      data: {
        courseId,
        title: dto.title.trim(),
        sortOrder: dto.sortOrder || 0,
      },
      include: { lessons: true },
    });
  }

  // 8. Update Section
  async updateSection(
    teacherId: string,
    sectionId: string,
    dto: Partial<CreateSectionDto>,
    isSuperAdmin = false,
  ) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Course section not found');
    }

    if (!isSuperAdmin && section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to edit this section');
    }

    return this.prisma.courseSection.update({
      where: { id: sectionId },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  // 9. Delete Section
  async deleteSection(teacherId: string, sectionId: string, isSuperAdmin = false) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Course section not found');
    }

    if (!isSuperAdmin && section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this section');
    }

    return this.prisma.courseSection.delete({
      where: { id: sectionId },
    });
  }

  // 10. Create Lesson
  async createLesson(
    teacherId: string,
    sectionId: string,
    dto: CreateLessonDto,
    isSuperAdmin = false,
  ) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Course section not found');
    }

    if (!isSuperAdmin && section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to add lessons to this course');
    }

    let slug = this.slugify(dto.title);
    const existing = await this.prisma.lesson.findUnique({
      where: { sectionId_slug: { sectionId, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    return this.prisma.lesson.create({
      data: {
        sectionId,
        title: dto.title.trim(),
        slug,
        content: dto.content.trim(),
        videoUrl: dto.videoUrl?.trim() || null,
        durationMinutes: dto.durationMinutes || 10,
        sortOrder: dto.sortOrder || 0,
        type: dto.type || LessonType.VIDEO,
        isFreePreview: dto.isFreePreview || false,
      },
    });
  }

  // 11. Get Lesson
  async getLesson(teacherId: string, lessonId: string, isSuperAdmin = false) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: { include: { course: true } },
        quiz: { include: { questions: { include: { options: true } } } },
        assignment: true,
        resources: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (!isSuperAdmin && lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to view this lesson');
    }

    return lesson;
  }

  // 12. Update Lesson
  async updateLesson(
    teacherId: string,
    lessonId: string,
    dto: Partial<CreateLessonDto>,
    isSuperAdmin = false,
  ) {
    await this.getLesson(teacherId, lessonId, isSuperAdmin);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.content && { content: dto.content.trim() }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl?.trim() || null }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.type && { type: dto.type }),
        ...(dto.isFreePreview !== undefined && { isFreePreview: dto.isFreePreview }),
      },
    });
  }

  // 13. Delete Lesson
  async deleteLesson(teacherId: string, lessonId: string, isSuperAdmin = false) {
    await this.getLesson(teacherId, lessonId, isSuperAdmin);

    return this.prisma.lesson.delete({
      where: { id: lessonId },
    });
  }

  // 14. Upsert Quiz
  async upsertQuiz(
    teacherId: string,
    lessonId: string,
    dto: UpsertQuizDto,
    isSuperAdmin = false,
  ) {
    await this.getLesson(teacherId, lessonId, isSuperAdmin);

    return this.prisma.quiz.upsert({
      where: { lessonId },
      create: {
        lessonId,
        title: dto.title.trim(),
        passingScore: dto.passingScore || 70,
        timeLimitMinutes: dto.timeLimitMinutes !== undefined ? dto.timeLimitMinutes : 30,
        attemptLimit: dto.attemptLimit !== undefined ? dto.attemptLimit : 3,
      },
      update: {
        title: dto.title.trim(),
        ...(dto.passingScore !== undefined && { passingScore: dto.passingScore }),
        ...(dto.timeLimitMinutes !== undefined && { timeLimitMinutes: dto.timeLimitMinutes }),
        ...(dto.attemptLimit !== undefined && { attemptLimit: dto.attemptLimit }),
      },
      include: { questions: { include: { options: true } } },
    });
  }

  // 15. Get Quiz
  async getQuiz(teacherId: string, quizId: string, isSuperAdmin = false) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { section: { include: { course: true } } } },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { options: true },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (!isSuperAdmin && quiz.lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage this quiz');
    }

    return quiz;
  }

  // 16. Create Question
  async createQuestion(
    teacherId: string,
    quizId: string,
    dto: CreateQuestionDto,
    isSuperAdmin = false,
  ) {
    await this.getQuiz(teacherId, quizId, isSuperAdmin);

    const questionType = dto.type || 'MULTIPLE_CHOICE';

    if (questionType === 'SHORT_ANSWER') {
      if (!dto.options || dto.options.length < 1) {
        throw new BadRequestException('A short-answer question must provide at least one accepted answer option');
      }
    } else {
      if (!dto.options || dto.options.length < 2) {
        throw new BadRequestException('A multiple choice or true/false question must have at least 2 answer options');
      }
    }

    const hasCorrect = dto.options.some((opt) => opt.isCorrect);
    if (!hasCorrect) {
      throw new BadRequestException('At least one answer option must be marked as correct');
    }

    return this.prisma.question.create({
      data: {
        quizId,
        text: dto.text.trim(),
        type: dto.type || 'MULTIPLE_CHOICE',
        points: dto.points || 1,
        options: {
          create: dto.options.map((opt) => ({
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: { options: true },
    });
  }

  // 17. Delete Question
  async deleteQuestion(teacherId: string, questionId: string, isSuperAdmin = false) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: { include: { lesson: { include: { section: { include: { course: true } } } } } } },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (!isSuperAdmin && question.quiz.lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this question');
    }

    return this.prisma.question.delete({
      where: { id: questionId },
    });
  }

  // 18. Upsert Assignment
  async upsertAssignment(
    teacherId: string,
    lessonId: string,
    dto: UpsertAssignmentDto,
    isSuperAdmin = false,
  ) {
    await this.getLesson(teacherId, lessonId, isSuperAdmin);

    return this.prisma.assignment.upsert({
      where: { lessonId },
      create: {
        lessonId,
        title: dto.title.trim(),
        instructions: dto.instructions.trim(),
        maxScore: dto.maxScore || 100,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      update: {
        title: dto.title.trim(),
        instructions: dto.instructions.trim(),
        maxScore: dto.maxScore || 100,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  // 19. Get Submissions Across Teacher Courses
  async getTeacherSubmissions(teacherId: string, status?: string) {
    const where: any = {
      assignment: {
        lesson: {
          section: {
            course: { authorId: teacherId },
          },
        },
      },
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const submissions = await this.prisma.assignmentSubmission.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        assignment: {
          include: {
            lesson: {
              include: {
                section: {
                  include: {
                    course: { select: { id: true, title: true, slug: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });

    return submissions.map((sub) => ({
      id: sub.id,
      assignmentId: sub.assignmentId,
      assignmentTitle: sub.assignment.title,
      maxScore: sub.assignment.maxScore,
      courseTitle: sub.assignment.lesson.section.course.title,
      lessonTitle: sub.assignment.lesson.title,
      studentId: sub.user.id,
      studentName: sub.user.fullName,
      studentEmail: sub.user.email,
      content: sub.content,
      fileUrl: sub.fileUrl,
      status: sub.status,
      grade: sub.grade,
      feedback: sub.feedback,
      submittedAt: sub.submittedAt,
      gradedAt: sub.gradedAt,
    }));
  }

  // 20. Grade Student Submission
  async gradeSubmission(
    teacherId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
    isSuperAdmin = false,
  ) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            lesson: {
              include: {
                section: {
                  include: { course: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (!isSuperAdmin && submission.assignment.lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to grade this submission');
    }

    if (dto.grade > submission.assignment.maxScore) {
      throw new BadRequestException(
        `Grade cannot exceed the maximum score of ${submission.assignment.maxScore}`,
      );
    }

    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback?.trim() || null,
        status: 'GRADED',
        gradedAt: new Date(),
      },
    });
  }

  // 21. Enrolled Students in Course
  async getCourseStudents(teacherId: string, courseId: string, isSuperAdmin = false) {
    await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profile: { select: { avatarUrl: true, phoneNumber: true } },
          },
        },
        _count: {
          select: {
            quizAttempts: true,
            submissions: true,
            lessonProgress: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((enr) => ({
      enrollmentId: enr.id,
      studentId: enr.user.id,
      studentName: enr.user.fullName,
      studentEmail: enr.user.email,
      avatarUrl: enr.user.profile?.avatarUrl,
      progressPercentage: enr.progressPercentage,
      completedAt: enr.completedAt,
      enrolledAt: enr.enrolledAt,
      quizzesAttempted: enr._count.quizAttempts,
      assignmentsSubmitted: enr._count.submissions,
      lessonsCompleted: enr._count.lessonProgress,
    }));
  }

  // 22. Course Analytics
  async getCourseAnalytics(teacherId: string, courseId: string, isSuperAdmin = false) {
    const course = await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      select: {
        progressPercentage: true,
        completedAt: true,
      },
    });

    const totalStudents = enrollments.length;
    const completedStudents = enrollments.filter((e) => e.completedAt !== null).length;
    const completionRate =
      totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;
    const averageProgress =
      totalStudents > 0
        ? Math.round(
            enrollments.reduce((acc, curr) => acc + curr.progressPercentage, 0) /
              totalStudents,
          )
        : 0;

    // Quiz statistics
    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: { quiz: { lesson: { section: { courseId } } } },
      select: { score: true, passed: true },
    });

    const totalQuizAttempts = quizAttempts.length;
    const passedQuizAttempts = quizAttempts.filter((a) => a.passed).length;
    const quizPassRate =
      totalQuizAttempts > 0
        ? Math.round((passedQuizAttempts / totalQuizAttempts) * 100)
        : 0;
    const avgQuizScore =
      totalQuizAttempts > 0
        ? Math.round(
            quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / totalQuizAttempts,
          )
        : 0;

    // Assignment backlog
    const pendingSubmissions = await this.prisma.assignmentSubmission.count({
      where: {
        assignment: { lesson: { section: { courseId } } },
        status: 'PENDING',
      },
    });

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalStudents,
      completedStudents,
      completionRate,
      averageProgress,
      totalQuizAttempts,
      quizPassRate,
      avgQuizScore,
      pendingSubmissions,
    };
  }

  // 23. Categories for Dropdowns
  async getCategories() {
    let categories = await this.prisma.courseCategory.findMany({
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      // Seed common categories if empty
      const defaultCategories = [
        { name: 'Computer Science & Software', slug: 'computer-science' },
        { name: 'Data Science & AI', slug: 'data-science' },
        { name: 'Business & Entrepreneurship', slug: 'business' },
        { name: 'Engineering & Technology', slug: 'engineering' },
        { name: 'Health & Medical Sciences', slug: 'health' },
      ];

      for (const cat of defaultCategories) {
        await this.prisma.courseCategory.upsert({
          where: { slug: cat.slug },
          create: cat,
          update: {},
        });
      }

      categories = await this.prisma.courseCategory.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return categories;
  }

  // 24. Submit Course for Review (Instructor Workflow)
  async submitCourseForReview(
    teacherId: string,
    courseId: string,
    isSuperAdmin = false,
  ) {
    const course = await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    // Business Rule: Course must have at least 1 section and at least 1 lesson
    const sections = await this.prisma.courseSection.findMany({
      where: { courseId },
      include: { _count: { select: { lessons: true } } },
    });

    if (sections.length === 0 || sections.every((s) => s._count.lessons === 0)) {
      throw new BadRequestException(
        'A course must contain at least one section and at least one lesson before submitting for review.',
      );
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PENDING_REVIEW },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: 'COURSE_SUBMITTED_FOR_REVIEW',
        entityType: 'Course',
        entityId: courseId,
        metadata: { courseTitle: course.title },
      },
    });

    return updated;
  }

  // 25. Publish Course
  async publishCourse(
    teacherId: string,
    courseId: string,
    isSuperAdmin = false,
  ) {
    const course = await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    const sections = await this.prisma.courseSection.findMany({
      where: { courseId },
      include: { _count: { select: { lessons: true } } },
    });

    if (sections.length === 0 || sections.every((s) => s._count.lessons === 0)) {
      throw new BadRequestException(
        'A course must contain at least one section and one lesson before publishing.',
      );
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: 'COURSE_PUBLISHED',
        entityType: 'Course',
        entityId: courseId,
        metadata: { courseTitle: course.title },
      },
    });

    return updated;
  }

  // 26. Archive Course
  async archiveCourse(
    teacherId: string,
    courseId: string,
    isSuperAdmin = false,
  ) {
    const course = await this.getCourseForTeacher(teacherId, courseId, isSuperAdmin);

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.ARCHIVED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: 'COURSE_ARCHIVED',
        entityType: 'Course',
        entityId: courseId,
        metadata: { courseTitle: course.title },
      },
    });

    return updated;
  }

  // 27. Add Lesson Resource
  async addLessonResource(
    teacherId: string,
    lessonId: string,
    dto: CreateResourceDto,
    isSuperAdmin = false,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (!isSuperAdmin && lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to attach resources to this lesson');
    }

    return this.prisma.lessonResource.create({
      data: {
        lessonId,
        title: dto.title.trim(),
        fileUrl: dto.fileUrl.trim(),
        fileType: dto.fileType || 'PDF',
        fileSize: dto.fileSize || 0,
      },
    });
  }

  // 28. Delete Lesson Resource
  async deleteLessonResource(
    teacherId: string,
    resourceId: string,
    isSuperAdmin = false,
  ) {
    const resource = await this.prisma.lessonResource.findUnique({
      where: { id: resourceId },
      include: { lesson: { include: { section: { include: { course: true } } } } },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (!isSuperAdmin && resource.lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this resource');
    }

    return this.prisma.lessonResource.delete({
      where: { id: resourceId },
    });
  }

  // 29. Public Marketplace: Search, Filter, Sort, Paginate (Only PUBLISHED Courses)
  async getMarketplaceCourses(query: MarketplaceQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 12));
    const skip = (page - 1) * limit;

    // Strict Security Filter: Only PUBLISHED courses can ever appear publicly
    const where: any = {
      status: CourseStatus.PUBLISHED,
    };

    if (query.search && query.search.trim() !== '') {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.category && query.category !== 'all') {
      where.category = {
        OR: [
          { slug: query.category.toLowerCase().trim() },
          { id: query.category },
          { name: { equals: query.category.trim(), mode: 'insensitive' } },
        ],
      };
    }

    if (query.difficulty && (query.difficulty as any) !== 'ALL') {
      where.difficulty = query.difficulty;
    }

    if (query.language && query.language !== 'all') {
      where.language = { equals: query.language.trim(), mode: 'insensitive' };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === MarketplaceSortBy.POPULAR) {
      orderBy = { enrollments: { _count: 'desc' } };
    } else if (query.sortBy === MarketplaceSortBy.NEWEST) {
      orderBy = { createdAt: 'desc' };
    } else if (query.sortBy === MarketplaceSortBy.DURATION_ASC) {
      orderBy = { estimatedHours: 'asc' };
    } else if (query.sortBy === MarketplaceSortBy.DURATION_DESC) {
      orderBy = { estimatedHours: 'desc' };
    }

    const [total, courses] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              profile: { select: { avatarUrl: true, bio: true } },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          institution: { select: { id: true, name: true, slug: true } },
          reviews: { select: { rating: true } },
          _count: {
            select: {
              sections: true,
              enrollments: true,
              reviews: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const formattedCourses = courses.map((c) => {
      const ratingsCount = c.reviews.length;
      const avgRating =
        ratingsCount > 0
          ? Number((c.reviews.reduce((acc, r) => acc + r.rating, 0) / ratingsCount).toFixed(1))
          : 5.0;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        language: c.language,
        difficulty: c.difficulty,
        learningObjectives: c.learningObjectives,
        prerequisites: c.prerequisites,
        estimatedHours: c.estimatedHours,
        status: c.status,
        category: c.category?.name || 'General',
        categorySlug: c.category?.slug || 'general',
        categoryId: c.categoryId,
        institutionName: c.institution?.name || null,
        author: {
          id: c.author.id,
          fullName: c.author.fullName,
          avatarUrl: c.author.profile?.avatarUrl || null,
          bio: c.author.profile?.bio || null,
        },
        enrollmentCount: c._count.enrollments,
        sectionCount: c._count.sections,
        reviewCount: c._count.reviews,
        averageRating: avgRating,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    if (query.sortBy === MarketplaceSortBy.HIGHEST_RATED) {
      formattedCourses.sort((a, b) => b.averageRating - a.averageRating);
    }

    return {
      data: formattedCourses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // 30. Public Marketplace: Course Details with Curriculum and Reviews
  async getMarketplaceCourseDetails(slugOrId: string, callerId?: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profile: { select: { avatarUrl: true, bio: true, timezone: true } },
            authoredCourses: {
              where: { status: CourseStatus.PUBLISHED },
              select: { id: true, title: true, slug: true },
            },
          },
        },
        category: true,
        institution: true,
        department: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                resources: true,
                quiz: { select: { id: true, title: true, passingScore: true } },
                assignment: { select: { id: true, title: true, maxScore: true } },
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profile: { select: { avatarUrl: true } },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course "${slugOrId}" not found`);
    }

    // Business Rule: Non-published courses cannot be viewed publicly
    if (course.status !== CourseStatus.PUBLISHED && course.authorId !== callerId) {
      throw new NotFoundException(`Course "${slugOrId}" is not publicly available.`);
    }

    const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
    const totalDurationMinutes = course.sections.reduce(
      (acc, s) => acc + s.lessons.reduce((lAcc, l) => lAcc + l.durationMinutes, 0),
      0,
    );

    const ratings = course.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 5.0;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
    });

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      language: course.language,
      difficulty: course.difficulty,
      learningObjectives: course.learningObjectives,
      prerequisites: course.prerequisites,
      estimatedHours: course.estimatedHours,
      status: course.status,
      category: course.category,
      institution: course.institution,
      department: course.department,
      author: {
        id: course.author.id,
        fullName: course.author.fullName,
        email: course.author.email,
        avatarUrl: course.author.profile?.avatarUrl || null,
        bio: course.author.profile?.bio || null,
        publishedCoursesCount: course.author.authoredCourses.length,
      },
      stats: {
        enrollmentCount: course._count.enrollments,
        reviewCount: course._count.reviews,
        averageRating,
        ratingDistribution,
        sectionsCount: course.sections.length,
        lessonsCount: totalLessons,
        totalDurationMinutes,
      },
      sections: course.sections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        sortOrder: sec.sortOrder,
        lessons: sec.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          durationMinutes: l.durationMinutes,
          sortOrder: l.sortOrder,
          type: l.type,
          isFreePreview: l.isFreePreview,
          hasQuiz: !!l.quiz,
          hasAssignment: !!l.assignment,
          resources: l.resources.map((res) => ({
            id: res.id,
            title: res.title,
            fileType: res.fileType,
            fileSize: res.fileSize,
          })),
        })),
      })),
      reviews: course.reviews.map((rev) => ({
        id: rev.id,
        rating: rev.rating,
        comment: rev.comment,
        createdAt: rev.createdAt,
        user: {
          id: rev.user.id,
          fullName: rev.user.fullName,
          avatarUrl: rev.user.profile?.avatarUrl || null,
        },
      })),
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }

  // 31. Public Marketplace Categories
  async getMarketplaceCategories() {
    const categories = await this.prisma.courseCategory.findMany({
      include: {
        _count: {
          select: {
            courses: {
              where: { status: CourseStatus.PUBLISHED },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      publishedCourseCount: cat._count.courses,
    }));
  }

  // 32. Public Instructor Profile
  async getMarketplaceInstructor(instructorId: string) {
    const instructor = await this.prisma.user.findUnique({
      where: { id: instructorId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            avatarUrl: true,
            bio: true,
            timezone: true,
          },
        },
        authoredCourses: {
          where: { status: CourseStatus.PUBLISHED },
          include: {
            category: { select: { name: true, slug: true } },
            reviews: { select: { rating: true } },
            _count: { select: { enrollments: true, reviews: true } },
          },
        },
      },
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    const allRatings = instructor.authoredCourses.flatMap((c) => c.reviews.map((r) => r.rating));
    const averageRating =
      allRatings.length > 0
        ? Number((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1))
        : 5.0;

    const totalStudents = instructor.authoredCourses.reduce(
      (acc, c) => acc + c._count.enrollments,
      0,
    );

    return {
      id: instructor.id,
      fullName: instructor.fullName,
      avatarUrl: instructor.profile?.avatarUrl || null,
      bio: instructor.profile?.bio || null,
      memberSince: instructor.createdAt,
      stats: {
        totalCourses: instructor.authoredCourses.length,
        totalStudents,
        averageRating,
        reviewCount: allRatings.length,
      },
      courses: instructor.authoredCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        difficulty: c.difficulty,
        language: c.language,
        estimatedHours: c.estimatedHours,
        category: c.category?.name || 'General',
        studentCount: c._count.enrollments,
        averageRating:
          c.reviews.length > 0
            ? Number((c.reviews.reduce((a, b) => a + b.rating, 0) / c.reviews.length).toFixed(1))
            : 5.0,
      })),
    };
  }

  // 33. Submit Course Review
  async createReview(userId: string, courseId: string, dto: CreateReviewDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Must be enrolled in this course to leave a review
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in this course to submit a review.');
    }

    const review = await this.prisma.review.upsert({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
      create: {
        courseId,
        userId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      update: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COURSE_REVIEW_SUBMITTED',
        entityType: 'Review',
        entityId: review.id,
        metadata: { courseId, rating: dto.rating },
      },
    });

    return review;
  }
}

