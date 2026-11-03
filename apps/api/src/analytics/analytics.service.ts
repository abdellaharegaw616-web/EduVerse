import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, Role, CourseStatus } from '../database/prisma.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { TeacherAnalyticsQueryDto } from './dto/teacher-analytics-query.dto';
import { InstitutionAnalyticsQueryDto } from './dto/institution-analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly institutionsService: InstitutionsService,
  ) {}

  // -------------------------------------------------------------
  // 1. STUDENT ANALYTICS
  // -------------------------------------------------------------

  async getStudentAnalytics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is inactive or suspended.');
    }

    const [enrollments, quizAttempts, lessonProgresses, submissions, certificates] =
      await Promise.all([
        this.prisma.enrollment.findMany({
          where: { userId },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnailUrl: true,
                _count: { select: { sections: true } },
              },
            },
            certificate: {
              select: { id: true, verificationCode: true, issuedAt: true },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        }),
        this.prisma.quizAttempt.findMany({
          where: { userId },
          include: {
            quiz: {
              select: {
                title: true,
                passingScore: true,
                lesson: {
                  select: {
                    title: true,
                    section: {
                      select: {
                        course: { select: { id: true, title: true, slug: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { attemptedAt: 'desc' },
        }),
        this.prisma.lessonProgress.findMany({
          where: { enrollment: { userId }, completed: true },
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                section: {
                  select: {
                    course: { select: { id: true, title: true, slug: true } },
                  },
                },
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        }),
        this.prisma.assignmentSubmission.findMany({
          where: { userId },
          select: { id: true, status: true, grade: true, submittedAt: true },
        }),
        this.prisma.certificate.findMany({
          where: { userId, isRevoked: false },
          select: { id: true, verificationCode: true, issuedAt: true },
        }),
      ]);

    const totalEnrolled = enrollments.length;
    const completedCourses = enrollments.filter((e) => e.completedAt !== null || e.progressPercentage >= 100);
    const inProgressCourses = enrollments.filter((e) => e.completedAt === null && e.progressPercentage < 100);

    const overallMeanProgress =
      totalEnrolled > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) /
              totalEnrolled,
          )
        : 0;

    const completionRate =
      totalEnrolled > 0
        ? Math.round((completedCourses.length / totalEnrolled) * 100)
        : 0;

    // Quiz computations
    const totalQuizzesAttempted = quizAttempts.length;
    const passedQuizzes = quizAttempts.filter((q) => q.passed);
    const quizPassRate =
      totalQuizzesAttempted > 0
        ? Math.round((passedQuizzes.length / totalQuizzesAttempted) * 100)
        : 0;

    const avgQuizScore =
      totalQuizzesAttempted > 0
        ? Math.round(
            quizAttempts.reduce((sum, q) => sum + q.score, 0) /
              totalQuizzesAttempted,
          )
        : 0;

    const highestScore =
      totalQuizzesAttempted > 0
        ? Math.max(...quizAttempts.map((q) => q.score))
        : null;

    return {
      userId,
      studentName: user.fullName,
      learningProgress: {
        totalEnrolledCourses: totalEnrolled,
        inProgressCoursesCount: inProgressCourses.length,
        completedCoursesCount: completedCourses.length,
        overallMeanProgress,
        coursesBreakdown: enrollments.map((e) => ({
          courseId: e.course.id,
          courseTitle: e.course.title,
          courseSlug: e.course.slug,
          thumbnailUrl: e.course.thumbnailUrl,
          progressPercentage: e.progressPercentage,
          completed: e.completedAt !== null || e.progressPercentage >= 100,
          completedAt: e.completedAt,
          enrolledAt: e.enrolledAt,
          certificateCode: e.certificate?.verificationCode || null,
        })),
      },
      courseCompletion: {
        completedCoursesCount: completedCourses.length,
        completionRate,
        graduatedCourses: completedCourses.map((e) => ({
          courseId: e.course.id,
          courseTitle: e.course.title,
          courseSlug: e.course.slug,
          completedAt: e.completedAt,
          certificateCode: e.certificate?.verificationCode || null,
        })),
      },
      quizPerformance: {
        totalAttempts: totalQuizzesAttempted,
        passedAttempts: passedQuizzes.length,
        quizPassRate,
        avgScore: avgQuizScore,
        highestScore,
        recentAttempts: quizAttempts.slice(0, 10).map((qa) => ({
          attemptId: qa.id,
          quizTitle: qa.quiz.title,
          courseTitle: qa.quiz.lesson.section.course.title,
          courseSlug: qa.quiz.lesson.section.course.slug,
          lessonTitle: qa.quiz.lesson.title,
          score: qa.score,
          passingScore: qa.quiz.passingScore,
          passed: qa.passed,
          attemptedAt: qa.attemptedAt,
        })),
      },
      learningActivity: {
        totalLessonsCompleted: lessonProgresses.length,
        totalAssignmentsSubmitted: submissions.length,
        totalCertificatesEarned: certificates.length,
        recentLessonActivity: lessonProgresses.map((lp) => ({
          lessonId: lp.lesson.id,
          lessonTitle: lp.lesson.title,
          courseTitle: lp.lesson.section.course.title,
          courseSlug: lp.lesson.section.course.slug,
          completedAt: lp.completedAt,
        })),
      },
    };
  }

  // -------------------------------------------------------------
  // 2. TEACHER ANALYTICS
  // -------------------------------------------------------------

  async getTeacherAnalytics(
    teacherId: string,
    query?: TeacherAnalyticsQueryDto,
    isSuperAdmin = false,
  ) {
    let courseFilter: any = { authorId: teacherId };

    if (query?.courseId) {
      const targetCourse = await this.prisma.course.findUnique({
        where: { id: query.courseId },
        select: { id: true, authorId: true, title: true },
      });

      if (!targetCourse) {
        throw new NotFoundException(`Course ${query.courseId} not found.`);
      }

      if (!isSuperAdmin && targetCourse.authorId !== teacherId) {
        throw new ForbiddenException(
          'Access denied: You can only inspect analytics for courses you have authored.',
        );
      }

      courseFilter = { id: query.courseId };
    }

    const [courses, enrollments, quizAttempts, pendingSubmissions, certificates] =
      await Promise.all([
        this.prisma.course.findMany({
          where: courseFilter,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            createdAt: true,
            _count: { select: { enrollments: true } },
          },
        }),
        this.prisma.enrollment.findMany({
          where: { course: courseFilter },
          select: {
            id: true,
            courseId: true,
            userId: true,
            progressPercentage: true,
            completedAt: true,
            enrolledAt: true,
          },
        }),
        this.prisma.quizAttempt.findMany({
          where: { quiz: { lesson: { section: { course: courseFilter } } } },
          select: {
            id: true,
            score: true,
            passed: true,
            quizId: true,
            quiz: { select: { title: true } },
          },
        }),
        this.prisma.assignmentSubmission.count({
          where: {
            assignment: { lesson: { section: { course: courseFilter } } },
            status: 'PENDING',
          },
        }),
        this.prisma.certificate.count({
          where: { course: courseFilter, isRevoked: false },
        }),
      ]);

    const totalStudentsEnrolled = enrollments.length;
    const completedStudents = enrollments.filter((e) => e.completedAt !== null || e.progressPercentage >= 100);
    const completionRate =
      totalStudentsEnrolled > 0
        ? Math.round((completedStudents.length / totalStudentsEnrolled) * 100)
        : 0;

    const cohortAverageProgress =
      totalStudentsEnrolled > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) /
              totalStudentsEnrolled,
          )
        : 0;

    // Progress distribution buckets (mutually exclusive)
    const distribution = {
      '0-25%': enrollments.filter((e) => e.completedAt === null && e.progressPercentage <= 25).length,
      '26-50%': enrollments.filter((e) => e.completedAt === null && e.progressPercentage > 25 && e.progressPercentage <= 50).length,
      '51-75%': enrollments.filter((e) => e.completedAt === null && e.progressPercentage > 50 && e.progressPercentage <= 75).length,
      '76-99%': enrollments.filter((e) => e.completedAt === null && e.progressPercentage > 75 && e.progressPercentage < 100).length,
      '100%': enrollments.filter((e) => e.completedAt !== null || e.progressPercentage >= 100).length,
    };

    // Quiz metrics
    const totalQuizAttempts = quizAttempts.length;
    const passedQuizAttempts = quizAttempts.filter((q) => q.passed);
    const quizPassRate =
      totalQuizAttempts > 0
        ? Math.round((passedQuizAttempts.length / totalQuizAttempts) * 100)
        : 0;

    const avgQuizScore =
      totalQuizAttempts > 0
        ? Math.round(
            quizAttempts.reduce((sum, q) => sum + q.score, 0) /
              totalQuizAttempts,
          )
        : 0;

    return {
      teacherId,
      courseEnrollment: {
        totalCoursesAuthored: courses.length,
        totalStudentsEnrolled,
        coursesSummary: courses.map((c) => {
          const cEnrollments = enrollments.filter((e) => e.courseId === c.id);
          const cCompleted = cEnrollments.filter((e) => e.completedAt !== null || e.progressPercentage >= 100).length;
          const cRate = cEnrollments.length > 0 ? Math.round((cCompleted / cEnrollments.length) * 100) : 0;
          const cAvgProgress =
            cEnrollments.length > 0
              ? Math.round(cEnrollments.reduce((s, e) => s + e.progressPercentage, 0) / cEnrollments.length)
              : 0;
          return {
            id: c.id,
            title: c.title,
            slug: c.slug,
            status: c.status,
            studentsEnrolled: cEnrollments.length,
            completedStudents: cCompleted,
            completionRate: cRate,
            averageProgress: cAvgProgress,
          };
        }),
      },
      studentProgress: {
        cohortAverageProgress,
        progressDistribution: distribution,
      },
      quizPerformance: {
        totalQuizAttempts,
        passedQuizAttempts: passedQuizAttempts.length,
        quizPassRate,
        avgQuizScore,
      },
      pendingGrading: {
        pendingSubmissionsCount: pendingSubmissions,
      },
      courseCompletion: {
        completedStudentsCount: completedStudents.length,
        completionRate,
        certificatesIssued: certificates,
      },
    };
  }

  // -------------------------------------------------------------
  // 3. INSTITUTION ADMIN ANALYTICS
  // -------------------------------------------------------------

  async getInstitutionAnalytics(
    caller: AuthenticatedUser,
    query?: InstitutionAnalyticsQueryDto,
  ) {
    const instId = await this.institutionsService.resolveInstitutionId(
      caller,
      query?.institutionId,
    );

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [
      totalTeachers,
      activeTeachers,
      totalStudents,
      activeStudents,
      departments,
      totalClasses,
      totalCourses,
      publishedCourses,
      certificatesIssued,
      enrollmentCount,
    ] = await Promise.all([
      this.prisma.institutionMember.count({
        where: { institutionId: instId, role: Role.TEACHER },
      }),
      this.prisma.institutionMember.count({
        where: { institutionId: instId, role: Role.TEACHER, user: { isActive: true } },
      }),
      this.prisma.institutionMember.count({
        where: { institutionId: instId, role: Role.STUDENT },
      }),
      this.prisma.institutionMember.count({
        where: { institutionId: instId, role: Role.STUDENT, user: { isActive: true } },
      }),
      this.prisma.department.findMany({
        where: { institutionId: instId },
        include: {
          _count: { select: { classes: true, courses: true } },
          classes: {
            select: {
              _count: { select: { enrollments: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.class.count({
        where: { department: { institutionId: instId } },
      }),
      this.prisma.course.count({
        where: { institutionId: instId },
      }),
      this.prisma.course.count({
        where: { institutionId: instId, status: CourseStatus.PUBLISHED },
      }),
      this.prisma.certificate.count({
        where: { course: { institutionId: instId }, isRevoked: false },
      }),
      this.prisma.enrollment.count({
        where: { course: { institutionId: instId } },
      }),
    ]);

    const totalDepartmentsCount = await this.prisma.department.count({
      where: { institutionId: instId },
    });

    const studentTeacherRatio =
      totalTeachers > 0
        ? (totalStudents / totalTeachers).toFixed(1)
        : 'N/A';

    const avgClassesPerTeacher =
      totalTeachers > 0
        ? Number((totalClasses / totalTeachers).toFixed(1))
        : 0;

    return {
      institutionId: instId,
      studentStatistics: {
        totalStudents,
        activeStudents,
        inactiveStudents: totalStudents - activeStudents,
        totalCourseEnrollments: enrollmentCount,
        studentTeacherRatio,
      },
      teacherStatistics: {
        totalTeachers,
        activeTeachers,
        inactiveTeachers: totalTeachers - activeTeachers,
        totalClassesAssigned: totalClasses,
        avgClassesPerTeacher,
      },
      courseStatistics: {
        totalAffiliatedCourses: totalCourses,
        publishedCourses,
        draftCourses: totalCourses - publishedCourses,
        totalCertificatesIssued: certificatesIssued,
        totalEnrollments: enrollmentCount,
      },
      departmentReports: {
        totalDepartments: totalDepartmentsCount,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalDepartmentsCount / limit) || 1,
        },
        departments: departments.map((d) => {
          const totalEnrollmentsInDeptClasses = d.classes.reduce(
            (sum, c) => sum + c._count.enrollments,
            0,
          );
          return {
            id: d.id,
            name: d.name,
            code: d.code,
            classCount: d._count.classes,
            courseCount: d._count.courses,
            classEnrollmentsCount: totalEnrollmentsInDeptClasses,
          };
        }),
      },
    };
  }

  // -------------------------------------------------------------
  // 4. SUPER ADMIN PLATFORM ANALYTICS
  // -------------------------------------------------------------

  async getPlatformAnalytics(days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      verifiedUsers,
      newUsersPastDays,
      rolesGroup,
      totalInstitutions,
      activeInstitutions,
      totalCourses,
      coursesByStatus,
      coursesByDifficulty,
      coursesByLanguage,
      totalEnrollments,
      completedEnrollments,
      totalCertificates,
      totalQuizAttempts,
      totalSubmissions,
      totalLessonsCompleted,
      totalAuditLogs,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: cutoffDate } } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      this.prisma.institution.count(),
      this.prisma.institution.count({ where: { isActive: true } }),
      this.prisma.course.count(),
      this.prisma.course.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.course.groupBy({
        by: ['difficulty'],
        _count: { id: true },
      }),
      this.prisma.course.groupBy({
        by: ['language'],
        _count: { id: true },
      }),
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { completedAt: { not: null } } }),
      this.prisma.certificate.count({ where: { isRevoked: false } }),
      this.prisma.quizAttempt.count(),
      this.prisma.assignmentSubmission.count(),
      this.prisma.lessonProgress.count({ where: { completed: true } }),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
    ]);

    const platformCompletionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    const roleBreakdown = rolesGroup.reduce(
      (acc, r) => ({ ...acc, [r.role]: r._count.id }),
      {} as Record<string, number>,
    );

    const statusBreakdown = coursesByStatus.reduce(
      (acc, s) => ({ ...acc, [s.status]: s._count.id }),
      {} as Record<string, number>,
    );

    const difficultyBreakdown = coursesByDifficulty.reduce(
      (acc, d) => ({ ...acc, [d.difficulty]: d._count.id }),
      {} as Record<string, number>,
    );

    const languageBreakdown = coursesByLanguage.reduce(
      (acc, l) => ({ ...acc, [l.language]: l._count.id }),
      {} as Record<string, number>,
    );

    return {
      telemetryWindowDays: days,
      platformUsers: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        verifiedUsers,
        newUsersInWindow: newUsersPastDays,
        roleBreakdown,
      },
      institutions: {
        totalInstitutions,
        activeInstitutions,
        inactiveInstitutions: totalInstitutions - activeInstitutions,
      },
      publishedCourses: {
        totalCourses,
        statusBreakdown,
        difficultyBreakdown,
        languageBreakdown,
      },
      enrollmentStatistics: {
        totalEnrollments,
        completedEnrollments,
        inProgressEnrollments: totalEnrollments - completedEnrollments,
        platformCompletionRate,
        totalCertificatesIssued: totalCertificates,
      },
      platformActivity: {
        totalQuizAttempts,
        totalAssignmentSubmissions: totalSubmissions,
        totalLessonsCompleted,
        totalAuditLogs,
        recentActivityStream: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          user: log.user
            ? {
                id: log.user.id,
                fullName: log.user.fullName,
                email: log.user.email,
                role: log.user.role,
              }
            : null,
          createdAt: log.createdAt,
        })),
      },
    };
  }
}
