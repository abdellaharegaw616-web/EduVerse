import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { PrismaService, CourseStatus } from '../database/prisma.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let prisma: any;

  const studentA = 'student-uuid-aaa';
  const studentB = 'student-uuid-bbb';
  const publishedCourseId = 'course-uuid-pub';
  const draftCourseId = 'course-uuid-draft';

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      course: {
        findUnique: jest.fn(),
      },
      enrollment: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      lessonProgress: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      assignment: {
        findMany: jest.fn(),
      },
      quizAttempt: {
        findMany: jest.fn(),
      },
      certificate: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  describe('getMyDashboard', () => {
    it('should aggregate metrics strictly scoped to authenticated student', async () => {
      const mockEnrollments = [
        {
          id: 'enr-1',
          userId: studentA,
          courseId: 'c-1',
          progressPercentage: 80,
          completedAt: null,
          course: {
            title: 'TypeScript Monorepos',
            slug: 'typescript-monorepos',
            author: { fullName: 'Dr. Abebe' },
            institution: { name: 'AAU', slug: 'aau' },
            category: { name: 'Computer Science' },
            sections: [],
          },
        },
        {
          id: 'enr-2',
          userId: studentA,
          courseId: 'c-2',
          progressPercentage: 100,
          completedAt: new Date(),
          course: {
            title: 'Cloud DevOps',
            slug: 'cloud-devops',
            author: { fullName: 'Dawit Y.' },
            institution: null,
            category: { name: 'Engineering' },
            sections: [],
          },
        },
      ];

      prisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      prisma.lessonProgress.findMany.mockResolvedValue([]);
      prisma.assignment.findMany.mockResolvedValue([]);
      prisma.quizAttempt.findMany.mockResolvedValue([]);
      prisma.certificate.findMany.mockResolvedValue([{ id: 'cert-1' }]);

      const dashboard = await service.getMyDashboard(studentA);

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: studentA },
        }),
      );
      expect(dashboard.stats.enrolledCount).toBe(2);
      expect(dashboard.stats.completedCount).toBe(1);
      expect(dashboard.stats.averageProgress).toBe(90);
      expect(dashboard.stats.certificatesCount).toBe(1);
    });

    it('should return zero statistics when student has no enrollments', async () => {
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.lessonProgress.findMany.mockResolvedValue([]);
      prisma.assignment.findMany.mockResolvedValue([]);
      prisma.quizAttempt.findMany.mockResolvedValue([]);
      prisma.certificate.findMany.mockResolvedValue([]);

      const dashboard = await service.getMyDashboard(studentB);

      expect(dashboard.stats.enrolledCount).toBe(0);
      expect(dashboard.stats.completedCount).toBe(0);
      expect(dashboard.stats.averageProgress).toBe(0);
      expect(dashboard.stats.certificatesCount).toBe(0);
    });
  });

  describe('getMyEnrollments', () => {
    it('should enforce pagination and student ownership', async () => {
      prisma.enrollment.count.mockResolvedValue(15);
      prisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', userId: studentA, progressPercentage: 50 },
      ]);

      const result = await service.getMyEnrollments(studentA, {
        page: 2,
        limit: 10,
        status: 'in-progress',
      });

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: studentA, completedAt: null },
          skip: 10,
          take: 10,
        }),
      );
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.total).toBe(15);
    });
  });

  describe('Phase 8B: Course Enrollment Workflow', () => {
    const publishedCourse = {
      id: publishedCourseId,
      title: 'Full Stack TypeScript',
      slug: 'full-stack-typescript',
      status: CourseStatus.PUBLISHED,
      authorId: 'author-1',
    };

    const unpublishedCourse = {
      id: draftCourseId,
      title: 'Draft Course In Progress',
      slug: 'draft-course',
      status: CourseStatus.DRAFT,
      authorId: 'author-1',
    };

    it('successfully enrolls active student in a published course', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentA, isActive: true });
      prisma.course.findUnique.mockResolvedValue(publishedCourse);
      prisma.enrollment.findUnique.mockResolvedValue(null); // No duplicate
      prisma.enrollment.create.mockResolvedValue({
        id: 'enr-new-1',
        userId: studentA,
        courseId: publishedCourseId,
        enrolledAt: new Date(),
        progressPercentage: 0.0,
        course: publishedCourse,
      });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.enrollInCourse(studentA, publishedCourseId);

      expect(prisma.enrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: studentA,
            courseId: publishedCourseId,
            progressPercentage: 0.0,
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COURSE_ENROLLMENT_CREATED',
            userId: studentA,
            entityId: 'enr-new-1',
          }),
        }),
      );
      expect(result.message).toBe('Successfully enrolled in course');
      expect(result.enrollment.status).toBe('IN_PROGRESS');
    });

    it('prevents duplicate enrollment using database uniqueness check (409 Conflict)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentA, isActive: true });
      prisma.course.findUnique.mockResolvedValue(publishedCourse);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-existing',
        userId: studentA,
        courseId: publishedCourseId,
      });

      await expect(
        service.enrollInCourse(studentA, publishedCourseId),
      ).rejects.toThrow(ConflictException);

      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('rejects enrollment in an unpublished course (400 BadRequest)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentA, isActive: true });
      prisma.course.findUnique.mockResolvedValue(unpublishedCourse);

      await expect(
        service.enrollInCourse(studentA, draftCourseId),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('forbids unauthorized enrollment if user account is suspended (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentA, isActive: false });

      await expect(
        service.enrollInCourse(studentA, publishedCourseId),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if target course does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentA, isActive: true });
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.enrollInCourse(studentA, 'non-existent-course-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Phase 8B: Enrolled Courses & History (GET /enrollments/me)', () => {
    it('returns enrolled courses with progress status and course summary', async () => {
      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: 'enr-1',
          userId: studentA,
          courseId: publishedCourseId,
          enrolledAt: new Date(),
          completedAt: null,
          progressPercentage: 45,
          course: {
            id: publishedCourseId,
            title: 'Full Stack TypeScript',
            slug: 'full-stack-typescript',
            description: 'Learn modern web engineering',
            thumbnailUrl: null,
            difficulty: 'INTERMEDIATE',
            language: 'English',
            estimatedHours: 25,
            category: { name: 'Engineering', slug: 'engineering' },
            author: { id: 'author-1', fullName: 'Dr. Abebe', profile: null },
            _count: { sections: 3, reviews: 10 },
            sections: [{ _count: { lessons: 4 } }, { _count: { lessons: 5 } }],
          },
        },
      ]);

      const enrollments = await service.getEnrollmentsMe(studentA);

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: studentA },
        }),
      );
      expect(enrollments.length).toBe(1);
      expect(enrollments[0]?.status).toBe('IN_PROGRESS');
      expect(enrollments[0]?.course.lessonsCount).toBe(9);
    });
  });

  describe('Phase 8B: Content Authorization & Cross-User Isolation', () => {
    it('denies access to non-enrolled students (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentB, role: 'STUDENT', isActive: true });
      prisma.course.findUnique.mockResolvedValue({
        id: publishedCourseId,
        authorId: 'author-1',
        status: CourseStatus.PUBLISHED,
      });
      prisma.enrollment.findUnique.mockResolvedValue(null); // Student B is not enrolled

      await expect(
        service.checkCourseAccess(studentB, publishedCourseId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('grants content access to enrolled students', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentA, role: 'STUDENT', isActive: true });
      prisma.course.findUnique.mockResolvedValue({
        id: publishedCourseId,
        authorId: 'author-1',
        status: CourseStatus.PUBLISHED,
      });
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-active',
        userId: studentA,
        courseId: publishedCourseId,
        progressPercentage: 50,
      });

      const access = await service.checkCourseAccess(studentA, publishedCourseId);
      expect(access.hasAccess).toBe(true);
      expect(access.role).toBe('STUDENT');
      expect(access.enrollmentId).toBe('enr-active');
    });

    it('grants content access to course author without needing student enrollment', async () => {
      const authorId = 'author-specialist-1';
      prisma.user.findUnique.mockResolvedValue({ id: authorId, role: 'TEACHER', isActive: true });
      prisma.course.findUnique.mockResolvedValue({
        id: publishedCourseId,
        authorId,
        status: CourseStatus.PUBLISHED,
      });

      const access = await service.checkCourseAccess(authorId, publishedCourseId);
      expect(access.hasAccess).toBe(true);
      expect(access.role).toBe('AUTHOR');
    });

    it('grants content access to platform SUPER_ADMIN', async () => {
      const adminId = 'super-admin-root';
      prisma.user.findUnique.mockResolvedValue({ id: adminId, role: 'SUPER_ADMIN', isActive: true });
      prisma.course.findUnique.mockResolvedValue({
        id: publishedCourseId,
        authorId: 'author-1',
        status: CourseStatus.PUBLISHED,
      });

      const access = await service.checkCourseAccess(adminId, publishedCourseId);
      expect(access.hasAccess).toBe(true);
      expect(access.role).toBe('SUPER_ADMIN');
    });
  });
});

