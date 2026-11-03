import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService, Role, CourseStatus, CourseDifficulty } from '../database/prisma.service';
import { InstitutionsService } from '../institutions/institutions.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

describe('AnalyticsService (Phase 8I: Analytics & Reporting)', () => {
  let service: AnalyticsService;
  let prisma: any;
  let institutionsService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      enrollment: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      quizAttempt: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      lessonProgress: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      assignmentSubmission: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      certificate: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      course: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      institution: {
        count: jest.fn(),
      },
      institutionMember: {
        count: jest.fn(),
      },
      department: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      class: {
        count: jest.fn(),
      },
      auditLog: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    institutionsService = {
      resolveInstitutionId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InstitutionsService, useValue: institutionsService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  // =========================================================================
  // 1. STUDENT ANALYTICS
  // =========================================================================
  describe('getStudentAnalytics', () => {
    const studentId = 'student-uuid-1';

    it('should throw ForbiddenException if user does not exist or is inactive', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getStudentAnalytics('non-existent')).rejects.toThrow(
        ForbiddenException,
      );

      prisma.user.findUnique.mockResolvedValueOnce({
        id: studentId,
        fullName: 'Inactive Student',
        isActive: false,
      });

      await expect(service.getStudentAnalytics(studentId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should accurately calculate student learning metrics, progress, and quiz scores', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: studentId,
        fullName: 'Abebe Bikila',
        isActive: true,
      });

      // 3 enrollments: 1 completed (100%), 1 half-way (50%), 1 not started (0%)
      prisma.enrollment.findMany.mockResolvedValueOnce([
        {
          id: 'enr-1',
          userId: studentId,
          courseId: 'course-1',
          progressPercentage: 100,
          completedAt: new Date('2026-03-01T10:00:00Z'),
          enrolledAt: new Date('2026-02-01T10:00:00Z'),
          course: {
            id: 'course-1',
            title: 'Modern Distributed Systems',
            slug: 'modern-distributed-systems',
            thumbnailUrl: 'https://img.eduverse.et/c1.jpg',
            _count: { sections: 4 },
          },
          certificate: {
            id: 'cert-1',
            verificationCode: 'EV-2026-A1B2C3D4E5F6',
            issuedAt: new Date('2026-03-01T10:00:00Z'),
          },
        },
        {
          id: 'enr-2',
          userId: studentId,
          courseId: 'course-2',
          progressPercentage: 50,
          completedAt: null,
          enrolledAt: new Date('2026-02-10T10:00:00Z'),
          course: {
            id: 'course-2',
            title: 'Advanced Machine Learning',
            slug: 'advanced-machine-learning',
            thumbnailUrl: 'https://img.eduverse.et/c2.jpg',
            _count: { sections: 5 },
          },
          certificate: null,
        },
        {
          id: 'enr-3',
          userId: studentId,
          courseId: 'course-3',
          progressPercentage: 0,
          completedAt: null,
          enrolledAt: new Date('2026-02-20T10:00:00Z'),
          course: {
            id: 'course-3',
            title: 'Database Internals',
            slug: 'database-internals',
            thumbnailUrl: null,
            _count: { sections: 3 },
          },
          certificate: null,
        },
      ]);

      // 3 quiz attempts: 2 passed (90, 80), 1 failed (40)
      prisma.quizAttempt.findMany.mockResolvedValueOnce([
        {
          id: 'attempt-1',
          score: 90,
          passed: true,
          attemptedAt: new Date('2026-02-15T12:00:00Z'),
          quiz: {
            title: 'System Design Principles',
            passingScore: 70,
            lesson: {
              title: 'Replication Models',
              section: {
                course: { id: 'course-1', title: 'Modern Distributed Systems', slug: 'modern-distributed-systems' },
              },
            },
          },
        },
        {
          id: 'attempt-2',
          score: 40,
          passed: false,
          attemptedAt: new Date('2026-02-16T12:00:00Z'),
          quiz: {
            title: 'Neural Networks Architecture',
            passingScore: 70,
            lesson: {
              title: 'Backpropagation',
              section: {
                course: { id: 'course-2', title: 'Advanced Machine Learning', slug: 'advanced-machine-learning' },
              },
            },
          },
        },
        {
          id: 'attempt-3',
          score: 80,
          passed: true,
          attemptedAt: new Date('2026-02-18T12:00:00Z'),
          quiz: {
            title: 'Optimization Functions',
            passingScore: 70,
            lesson: {
              title: 'Gradient Descent',
              section: {
                course: { id: 'course-2', title: 'Advanced Machine Learning', slug: 'advanced-machine-learning' },
              },
            },
          },
        },
      ]);

      // 2 completed lessons
      prisma.lessonProgress.findMany.mockResolvedValueOnce([
        {
          lesson: {
            id: 'l-1',
            title: 'Replication Models',
            section: { course: { id: 'course-1', title: 'Modern Distributed Systems', slug: 'modern-distributed-systems' } },
          },
          completedAt: new Date('2026-02-15T10:00:00Z'),
        },
        {
          lesson: {
            id: 'l-2',
            title: 'Backpropagation',
            section: { course: { id: 'course-2', title: 'Advanced Machine Learning', slug: 'advanced-machine-learning' } },
          },
          completedAt: new Date('2026-02-16T10:00:00Z'),
        },
      ]);

      // 2 assignment submissions
      prisma.assignmentSubmission.findMany.mockResolvedValueOnce([
        { id: 'sub-1', status: 'GRADED', grade: 95, submittedAt: new Date() },
        { id: 'sub-2', status: 'PENDING', grade: null, submittedAt: new Date() },
      ]);

      // 1 certificate
      prisma.certificate.findMany.mockResolvedValueOnce([
        { id: 'cert-1', verificationCode: 'EV-2026-A1B2C3D4E5F6', issuedAt: new Date('2026-03-01T10:00:00Z') },
      ]);

      const result = await service.getStudentAnalytics(studentId);

      expect(result.userId).toBe(studentId);
      expect(result.studentName).toBe('Abebe Bikila');

      // Learning progress assertions
      expect(result.learningProgress.totalEnrolledCourses).toBe(3);
      expect(result.learningProgress.inProgressCoursesCount).toBe(2);
      expect(result.learningProgress.completedCoursesCount).toBe(1);
      // Mean: (100 + 50 + 0) / 3 = 50%
      expect(result.learningProgress.overallMeanProgress).toBe(50);
      expect(result.learningProgress.coursesBreakdown).toHaveLength(3);
      expect(result.learningProgress.coursesBreakdown[0]!.certificateCode).toBe('EV-2026-A1B2C3D4E5F6');

      // Course completion assertions
      expect(result.courseCompletion.completedCoursesCount).toBe(1);
      // Completion rate: (1 / 3) * 100 = 33%
      expect(result.courseCompletion.completionRate).toBe(33);
      expect(result.courseCompletion.graduatedCourses).toHaveLength(1);
      expect(result.courseCompletion.graduatedCourses[0]!.courseTitle).toBe('Modern Distributed Systems');

      // Quiz performance assertions
      expect(result.quizPerformance.totalAttempts).toBe(3);
      expect(result.quizPerformance.passedAttempts).toBe(2);
      // Pass rate: (2 / 3) * 100 = 67%
      expect(result.quizPerformance.quizPassRate).toBe(67);
      // Avg score: (90 + 40 + 80) / 3 = 70
      expect(result.quizPerformance.avgScore).toBe(70);
      expect(result.quizPerformance.highestScore).toBe(90);
      expect(result.quizPerformance.recentAttempts).toHaveLength(3);

      // Learning activity assertions
      expect(result.learningActivity.totalLessonsCompleted).toBe(2);
      expect(result.learningActivity.totalAssignmentsSubmitted).toBe(2);
      expect(result.learningActivity.totalCertificatesEarned).toBe(1);
      expect(result.learningActivity.recentLessonActivity).toHaveLength(2);
    });

    it('should gracefully handle students with 0 enrollments and no activities without NaN', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: studentId,
        fullName: 'New Student',
        isActive: true,
      });

      prisma.enrollment.findMany.mockResolvedValueOnce([]);
      prisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      prisma.lessonProgress.findMany.mockResolvedValueOnce([]);
      prisma.assignmentSubmission.findMany.mockResolvedValueOnce([]);
      prisma.certificate.findMany.mockResolvedValueOnce([]);

      const result = await service.getStudentAnalytics(studentId);

      expect(result.learningProgress.totalEnrolledCourses).toBe(0);
      expect(result.learningProgress.inProgressCoursesCount).toBe(0);
      expect(result.learningProgress.completedCoursesCount).toBe(0);
      expect(result.learningProgress.overallMeanProgress).toBe(0);
      expect(result.courseCompletion.completionRate).toBe(0);
      expect(result.quizPerformance.totalAttempts).toBe(0);
      expect(result.quizPerformance.passedAttempts).toBe(0);
      expect(result.quizPerformance.quizPassRate).toBe(0);
      expect(result.quizPerformance.avgScore).toBe(0);
      expect(result.quizPerformance.highestScore).toBeNull();
      expect(result.learningActivity.totalLessonsCompleted).toBe(0);
    });
  });

  // =========================================================================
  // 2. TEACHER ANALYTICS
  // =========================================================================
  describe('getTeacherAnalytics', () => {
    const teacherId = 'teacher-uuid-1';

    it('should aggregate metrics across all authored courses for a teacher', async () => {
      const mockCourses = [
        {
          id: 'c-1',
          title: 'Intro to Python',
          slug: 'intro-python',
          status: CourseStatus.PUBLISHED,
          createdAt: new Date(),
          _count: { enrollments: 3 },
        },
        {
          id: 'c-2',
          title: 'Advanced Django',
          slug: 'advanced-django',
          status: CourseStatus.PUBLISHED,
          createdAt: new Date(),
          _count: { enrollments: 2 },
        },
      ];

      // 5 enrollments total:
      // c-1: 100% (completed), 80% (in-prog), 20% (in-prog)
      // c-2: 60% (in-prog), 40% (in-prog)
      const mockEnrollments = [
        { id: 'e-1', courseId: 'c-1', userId: 'u-1', progressPercentage: 100, completedAt: new Date() },
        { id: 'e-2', courseId: 'c-1', userId: 'u-2', progressPercentage: 80, completedAt: null },
        { id: 'e-3', courseId: 'c-1', userId: 'u-3', progressPercentage: 20, completedAt: null },
        { id: 'e-4', courseId: 'c-2', userId: 'u-4', progressPercentage: 60, completedAt: null },
        { id: 'e-5', courseId: 'c-2', userId: 'u-5', progressPercentage: 40, completedAt: null },
      ];

      // 3 quiz attempts: 2 passed, 1 failed
      const mockQuizAttempts = [
        { id: 'qa-1', score: 100, passed: true, quizId: 'q-1', quiz: { title: 'Syntax' } },
        { id: 'qa-2', score: 80, passed: true, quizId: 'q-1', quiz: { title: 'Syntax' } },
        { id: 'qa-3', score: 30, passed: false, quizId: 'q-2', quiz: { title: 'ORM' } },
      ];

      prisma.course.findMany.mockResolvedValueOnce(mockCourses);
      prisma.enrollment.findMany.mockResolvedValueOnce(mockEnrollments);
      prisma.quizAttempt.findMany.mockResolvedValueOnce(mockQuizAttempts);
      prisma.assignmentSubmission.count.mockResolvedValueOnce(4); // 4 pending reviews
      prisma.certificate.count.mockResolvedValueOnce(1); // 1 certificate issued

      const result = await service.getTeacherAnalytics(teacherId);

      expect(result.teacherId).toBe(teacherId);
      expect(result.courseEnrollment.totalCoursesAuthored).toBe(2);
      expect(result.courseEnrollment.totalStudentsEnrolled).toBe(5);

      // Per-course breakdown
      expect(result.courseEnrollment.coursesSummary).toHaveLength(2);
      expect(result.courseEnrollment.coursesSummary[0]!.studentsEnrolled).toBe(3);
      expect(result.courseEnrollment.coursesSummary[0]!.completedStudents).toBe(1);
      // c-1 avg: (100 + 80 + 20) / 3 = 67%
      expect(result.courseEnrollment.coursesSummary[0]!.averageProgress).toBe(67);

      // Cohort metrics: (100 + 80 + 20 + 60 + 40) / 5 = 60%
      expect(result.studentProgress.cohortAverageProgress).toBe(60);

      // Distribution buckets:
      // '0-25%': e-3 (20%) -> 1
      // '26-50%': e-5 (40%) -> 1
      // '51-75%': e-4 (60%) -> 1
      // '76-99%': e-2 (80%) -> 1
      // '100%': e-1 (100%) -> 1
      expect(result.studentProgress.progressDistribution['0-25%']).toBe(1);
      expect(result.studentProgress.progressDistribution['26-50%']).toBe(1);
      expect(result.studentProgress.progressDistribution['51-75%']).toBe(1);
      expect(result.studentProgress.progressDistribution['76-99%']).toBe(1);
      expect(result.studentProgress.progressDistribution['100%']).toBe(1);

      // Quiz metrics
      expect(result.quizPerformance.totalQuizAttempts).toBe(3);
      expect(result.quizPerformance.passedQuizAttempts).toBe(2);
      // Pass rate: (2 / 3) * 100 = 67%
      expect(result.quizPerformance.quizPassRate).toBe(67);
      // Avg score: (100 + 80 + 30) / 3 = 70
      expect(result.quizPerformance.avgQuizScore).toBe(70);

      // Grading and certificates
      expect(result.pendingGrading.pendingSubmissionsCount).toBe(4);
      expect(result.courseCompletion.completedStudentsCount).toBe(1);
      // Completion rate: (1 / 5) * 100 = 20%
      expect(result.courseCompletion.completionRate).toBe(20);
      expect(result.courseCompletion.certificatesIssued).toBe(1);
    });

    it('should enforce author ownership when courseId query filter is passed', async () => {
      // 1. Course not found
      prisma.course.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.getTeacherAnalytics(teacherId, { courseId: 'missing-course' }),
      ).rejects.toThrow(NotFoundException);

      // 2. Course owned by someone else -> ForbiddenException
      prisma.course.findUnique.mockResolvedValueOnce({
        id: 'foreign-course',
        authorId: 'other-teacher',
        title: 'Other Course',
      });
      await expect(
        service.getTeacherAnalytics(teacherId, { courseId: 'foreign-course' }),
      ).rejects.toThrow(ForbiddenException);

      // 3. Super Admin bypass can inspect foreign course
      prisma.course.findUnique.mockResolvedValueOnce({
        id: 'foreign-course',
        authorId: 'other-teacher',
        title: 'Other Course',
      });
      prisma.course.findMany.mockResolvedValueOnce([
        {
          id: 'foreign-course',
          title: 'Other Course',
          slug: 'other-course',
          status: CourseStatus.PUBLISHED,
          createdAt: new Date(),
          _count: { enrollments: 0 },
        },
      ]);
      prisma.enrollment.findMany.mockResolvedValueOnce([]);
      prisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      prisma.assignmentSubmission.count.mockResolvedValueOnce(0);
      prisma.certificate.count.mockResolvedValueOnce(0);

      const superAdminResult = await service.getTeacherAnalytics(
        'super-admin-id',
        { courseId: 'foreign-course' },
        true, // isSuperAdmin
      );
      expect(superAdminResult.courseEnrollment.totalCoursesAuthored).toBe(1);
    });

    it('should safely return zeroes for teachers with no courses or enrollments', async () => {
      prisma.course.findMany.mockResolvedValueOnce([]);
      prisma.enrollment.findMany.mockResolvedValueOnce([]);
      prisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      prisma.assignmentSubmission.count.mockResolvedValueOnce(0);
      prisma.certificate.count.mockResolvedValueOnce(0);

      const result = await service.getTeacherAnalytics(teacherId);

      expect(result.courseEnrollment.totalCoursesAuthored).toBe(0);
      expect(result.courseEnrollment.totalStudentsEnrolled).toBe(0);
      expect(result.studentProgress.cohortAverageProgress).toBe(0);
      expect(result.quizPerformance.quizPassRate).toBe(0);
      expect(result.quizPerformance.avgQuizScore).toBe(0);
      expect(result.courseCompletion.completionRate).toBe(0);
    });
  });

  // =========================================================================
  // 3. INSTITUTION ADMIN ANALYTICS
  // =========================================================================
  describe('getInstitutionAnalytics', () => {
    const caller: AuthenticatedUser = {
      id: 'admin-1',
      email: 'admin@aau.edu.et',
      fullName: 'Admin User',
      role: Role.INSTITUTION_ADMIN,
      isActive: true,
      isEmailVerified: true,
    };

    const instId = 'aau-uuid-1';

    it('should delegate institution resolution and calculate multi-tenant metrics', async () => {
      institutionsService.resolveInstitutionId.mockResolvedValueOnce(instId);

      // Mock DB counts
      prisma.institutionMember.count
        .mockResolvedValueOnce(10) // totalTeachers
        .mockResolvedValueOnce(8)  // activeTeachers
        .mockResolvedValueOnce(100) // totalStudents
        .mockResolvedValueOnce(90); // activeStudents

      prisma.department.findMany.mockResolvedValueOnce([
        {
          id: 'dept-cs',
          name: 'Computer Science',
          code: 'CS',
          _count: { classes: 5, courses: 8 },
          classes: [
            { _count: { enrollments: 25 } },
            { _count: { enrollments: 35 } },
          ],
        },
      ]);

      prisma.class.count.mockResolvedValueOnce(20);
      prisma.course.count
        .mockResolvedValueOnce(12) // totalCourses
        .mockResolvedValueOnce(10); // publishedCourses
      prisma.certificate.count.mockResolvedValueOnce(45);
      prisma.enrollment.count.mockResolvedValueOnce(350);
      prisma.department.count.mockResolvedValueOnce(1);

      const result = await service.getInstitutionAnalytics(caller, { page: 1, limit: 10 });

      expect(institutionsService.resolveInstitutionId).toHaveBeenCalledWith(caller, undefined);
      expect(result.institutionId).toBe(instId);

      // Student stats
      expect(result.studentStatistics.totalStudents).toBe(100);
      expect(result.studentStatistics.activeStudents).toBe(90);
      expect(result.studentStatistics.inactiveStudents).toBe(10);
      expect(result.studentStatistics.totalCourseEnrollments).toBe(350);
      // Student-Teacher Ratio: 100 / 10 = 10.0
      expect(result.studentStatistics.studentTeacherRatio).toBe('10.0');

      // Teacher stats
      expect(result.teacherStatistics.totalTeachers).toBe(10);
      expect(result.teacherStatistics.activeTeachers).toBe(8);
      expect(result.teacherStatistics.inactiveTeachers).toBe(2);
      expect(result.teacherStatistics.totalClassesAssigned).toBe(20);
      // Avg classes per teacher: 20 / 10 = 2.0
      expect(result.teacherStatistics.avgClassesPerTeacher).toBe(2);

      // Course stats
      expect(result.courseStatistics.totalAffiliatedCourses).toBe(12);
      expect(result.courseStatistics.publishedCourses).toBe(10);
      expect(result.courseStatistics.draftCourses).toBe(2);
      expect(result.courseStatistics.totalCertificatesIssued).toBe(45);

      // Department reports
      expect(result.departmentReports.totalDepartments).toBe(1);
      expect(result.departmentReports.pagination.totalPages).toBe(1);
      expect(result.departmentReports.departments[0]!.classEnrollmentsCount).toBe(60); // 25 + 35
    });

    it('should propagate ForbiddenException if cross-tenant access is attempted', async () => {
      institutionsService.resolveInstitutionId.mockRejectedValueOnce(
        new ForbiddenException('Cross-tenant boundary violation.'),
      );

      await expect(
        service.getInstitutionAnalytics(caller, { institutionId: 'foreign-inst' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should safely format ratios when an institution has 0 faculty members', async () => {
      institutionsService.resolveInstitutionId.mockResolvedValueOnce(instId);

      prisma.institutionMember.count
        .mockResolvedValueOnce(0) // totalTeachers = 0
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(50) // totalStudents = 50
        .mockResolvedValueOnce(50);

      prisma.department.findMany.mockResolvedValueOnce([]);
      prisma.class.count.mockResolvedValueOnce(0);
      prisma.course.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.certificate.count.mockResolvedValueOnce(0);
      prisma.enrollment.count.mockResolvedValueOnce(0);
      prisma.department.count.mockResolvedValueOnce(0);

      const result = await service.getInstitutionAnalytics(caller);

      expect(result.studentStatistics.studentTeacherRatio).toBe('N/A');
      expect(result.teacherStatistics.avgClassesPerTeacher).toBe(0);
    });
  });

  // =========================================================================
  // 4. SUPER ADMIN PLATFORM ANALYTICS
  // =========================================================================
  describe('getPlatformAnalytics', () => {
    it('should compute platform telemetry and activity streams across specified window', async () => {
      // Mock all 20 Promise.all queries
      prisma.user.count
        .mockResolvedValueOnce(500) // totalUsers
        .mockResolvedValueOnce(480) // activeUsers
        .mockResolvedValueOnce(20)  // suspendedUsers
        .mockResolvedValueOnce(450) // verifiedUsers
        .mockResolvedValueOnce(60);  // newUsersPastDays

      prisma.user.groupBy.mockResolvedValueOnce([
        { role: Role.STUDENT, _count: { id: 400 } },
        { role: Role.TEACHER, _count: { id: 80 } },
        { role: Role.INSTITUTION_ADMIN, _count: { id: 18 } },
        { role: Role.SUPER_ADMIN, _count: { id: 2 } },
      ]);

      prisma.institution.count
        .mockResolvedValueOnce(15) // totalInstitutions
        .mockResolvedValueOnce(12); // activeInstitutions

      prisma.course.count.mockResolvedValueOnce(60); // totalCourses

      prisma.course.groupBy
        .mockResolvedValueOnce([
          { status: CourseStatus.PUBLISHED, _count: { id: 45 } },
          { status: CourseStatus.DRAFT, _count: { id: 15 } },
        ])
        .mockResolvedValueOnce([
          { difficulty: CourseDifficulty.BEGINNER, _count: { id: 30 } },
          { difficulty: CourseDifficulty.INTERMEDIATE, _count: { id: 20 } },
          { difficulty: CourseDifficulty.ADVANCED, _count: { id: 10 } },
        ])
        .mockResolvedValueOnce([
          { language: 'AMHARIC', _count: { id: 35 } },
          { language: 'ENGLISH', _count: { id: 25 } },
        ]);

      prisma.enrollment.count
        .mockResolvedValueOnce(1000) // totalEnrollments
        .mockResolvedValueOnce(400); // completedEnrollments

      prisma.certificate.count.mockResolvedValueOnce(380);
      prisma.quizAttempt.count.mockResolvedValueOnce(2500);
      prisma.assignmentSubmission.count.mockResolvedValueOnce(800);
      prisma.lessonProgress.count.mockResolvedValueOnce(12000);
      prisma.auditLog.count.mockResolvedValueOnce(5000);

      prisma.auditLog.findMany.mockResolvedValueOnce([
        {
          id: 'log-1',
          action: 'PUBLISH_COURSE',
          entityType: 'Course',
          entityId: 'c-101',
          user: {
            id: 'admin-1',
            fullName: 'Super Admin',
            email: 'admin@eduverse.et',
            role: Role.SUPER_ADMIN,
          },
          createdAt: new Date('2026-03-01T15:00:00Z'),
        },
      ]);

      const result = await service.getPlatformAnalytics(14); // 14-day window

      expect(result.telemetryWindowDays).toBe(14);
      expect(result.platformUsers.totalUsers).toBe(500);
      expect(result.platformUsers.activeUsers).toBe(480);
      expect(result.platformUsers.suspendedUsers).toBe(20);
      expect(result.platformUsers.newUsersInWindow).toBe(60);
      expect(result.platformUsers.roleBreakdown[Role.STUDENT]).toBe(400);

      expect(result.institutions.totalInstitutions).toBe(15);
      expect(result.institutions.activeInstitutions).toBe(12);
      expect(result.institutions.inactiveInstitutions).toBe(3);

      expect(result.publishedCourses.totalCourses).toBe(60);
      expect(result.publishedCourses.statusBreakdown[CourseStatus.PUBLISHED]).toBe(45);
      expect(result.publishedCourses.difficultyBreakdown[CourseDifficulty.BEGINNER]).toBe(30);

      expect(result.enrollmentStatistics.totalEnrollments).toBe(1000);
      expect(result.enrollmentStatistics.completedEnrollments).toBe(400);
      expect(result.enrollmentStatistics.inProgressEnrollments).toBe(600);
      // Platform completion rate: (400 / 1000) * 100 = 40%
      expect(result.enrollmentStatistics.platformCompletionRate).toBe(40);
      expect(result.enrollmentStatistics.totalCertificatesIssued).toBe(380);

      expect(result.platformActivity.totalQuizAttempts).toBe(2500);
      expect(result.platformActivity.totalAssignmentSubmissions).toBe(800);
      expect(result.platformActivity.totalLessonsCompleted).toBe(12000);
      expect(result.platformActivity.totalAuditLogs).toBe(5000);
      expect(result.platformActivity.recentActivityStream).toHaveLength(1);
      expect(result.platformActivity.recentActivityStream[0]!.action).toBe('PUBLISH_COURSE');
    });

    it('should gracefully handle empty platform state without divisions by zero', async () => {
      prisma.user.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      prisma.user.groupBy.mockResolvedValueOnce([]);
      prisma.institution.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.course.count.mockResolvedValueOnce(0);
      prisma.course.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.enrollment.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.certificate.count.mockResolvedValueOnce(0);
      prisma.quizAttempt.count.mockResolvedValueOnce(0);
      prisma.assignmentSubmission.count.mockResolvedValueOnce(0);
      prisma.lessonProgress.count.mockResolvedValueOnce(0);
      prisma.auditLog.count.mockResolvedValueOnce(0);
      prisma.auditLog.findMany.mockResolvedValueOnce([]);

      const result = await service.getPlatformAnalytics();

      expect(result.platformUsers.totalUsers).toBe(0);
      expect(result.enrollmentStatistics.platformCompletionRate).toBe(0);
      expect(result.platformActivity.recentActivityStream).toEqual([]);
    });
  });
});
