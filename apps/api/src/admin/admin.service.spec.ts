import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService, CourseStatus, Role } from '../database/prisma.service';
import { ModerationAction } from './dto/moderate-course.dto';

describe('AdminService (Phase 8J: Platform Moderation & Audit Logs)', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn(),
      },
      institution: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      course: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      courseCategory: {
        findMany: jest.fn(),
      },
      review: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      enrollment: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      assignmentSubmission: {
        count: jest.fn(),
      },
      auditLog: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // =========================================================================
  // 1. OVERVIEW & ANALYTICS
  // =========================================================================
  describe('getOverview & getAnalytics', () => {
    it('should aggregate user, institution, course and system metrics', async () => {
      prisma.user.count
        .mockResolvedValueOnce(120) // total
        .mockResolvedValueOnce(115) // active
        .mockResolvedValueOnce(5); // suspended
      prisma.user.groupBy.mockResolvedValue([
        { role: 'STUDENT', _count: { id: 100 } },
        { role: 'TEACHER', _count: { id: 15 } },
        { role: 'SUPER_ADMIN', _count: { id: 5 } },
      ]);
      prisma.institution.count.mockResolvedValue(4);
      prisma.course.groupBy.mockResolvedValue([
        { status: CourseStatus.PUBLISHED, _count: { id: 25 } },
        { status: CourseStatus.PENDING_REVIEW, _count: { id: 3 } },
      ]);
      prisma.enrollment.count.mockResolvedValue(340);
      prisma.assignmentSubmission.count.mockResolvedValue(180);

      const overview = await service.getOverview();

      expect(overview.users.total).toBe(120);
      expect(overview.users.active).toBe(115);
      expect(overview.users.suspended).toBe(5);
      expect(overview.institutions.total).toBe(4);
      expect(overview.courses.published).toBe(25);
      expect(overview.courses.pendingReview).toBe(3);
      expect(overview.enrollments.total).toBe(340);
      expect(overview.system.status).toBe('HEALTHY');
    });

    it('should calculate platform learning analytics and category distribution', async () => {
      prisma.user.count.mockResolvedValue(200);
      prisma.enrollment.groupBy.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      prisma.courseCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Computer Science', _count: { courses: 15 } },
      ]);
      prisma.enrollment.count
        .mockResolvedValueOnce(40) // completions
        .mockResolvedValueOnce(100); // total enrollments

      const analytics = await service.getAnalytics();

      expect(analytics.totalUsers).toBe(200);
      expect(analytics.activeLearners).toBe(2);
      expect(analytics.completionRate).toBe(40);
      expect(analytics.categories[0]!.category).toBe('Computer Science');
    });
  });

  // =========================================================================
  // 2. USER MODERATION (SUSPENSION & REACTIVATION)
  // =========================================================================
  describe('User Moderation (getUsers, getUserById, setUserStatus)', () => {
    const adminId = 'super-admin-uuid';
    const targetUserId = 'violator-uuid-1';

    it('should return paginated users with filters and counts', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        {
          id: targetUserId,
          fullName: 'Test User',
          email: 'test@eduverse.et',
          role: Role.STUDENT,
          isActive: true,
          isEmailVerified: true,
          createdAt: new Date(),
          _count: { authoredCourses: 0, enrollments: 3, institutionMemberships: 0 },
        },
      ]);

      const result = await service.getUsers({ page: 1, limit: 10, role: Role.STUDENT, isActive: true });

      expect(result.total).toBe(1);
      expect(result.users[0]!.email).toBe('test@eduverse.et');
      expect(result.totalPages).toBe(1);
    });

    it('should throw NotFoundException if target user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setUserStatus(adminId, 'non-existent', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when attempting to suspend a root SUPER_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'super-admin-2',
        role: Role.SUPER_ADMIN,
        email: 'root@eduverse.et',
        isActive: true,
      });

      await expect(
        service.setUserStatus(adminId, 'super-admin-2', { isActive: false }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should suspend user, revoke active refresh tokens, audit action, and notify user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        role: Role.STUDENT,
        email: 'violator@eduverse.et',
        isActive: true,
      });
      prisma.user.update.mockResolvedValue({
        id: targetUserId,
        email: 'violator@eduverse.et',
        isActive: false,
      });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.setUserStatus(adminId, targetUserId, {
        isActive: false,
        reason: 'Violated academic integrity rules',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: targetUserId },
        data: { isActive: false },
        select: expect.any(Object),
      });
      // Revoke tokens immediately
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: targetUserId },
      });
      // Audit log captures actor, action, target, metadata, and outcome
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminId,
            action: 'USER_ACCOUNT_SUSPENDED',
            entityType: 'User',
            entityId: targetUserId,
            metadata: expect.objectContaining({
              outcome: 'SUCCESS',
              reason: 'Violated academic integrity rules',
              targetEmail: 'violator@eduverse.et',
            }),
          }),
        }),
      );
      expect(result.isActive).toBe(false);
    });

    it('should reactivate a suspended user and record audit log', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        role: Role.TEACHER,
        email: 'teacher@eduverse.et',
        isActive: false,
      });
      prisma.user.update.mockResolvedValue({
        id: targetUserId,
        email: 'teacher@eduverse.et',
        isActive: true,
      });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.setUserStatus(adminId, targetUserId, {
        isActive: true,
        reason: 'Account reinstated upon review',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: targetUserId },
        data: { isActive: true },
        select: expect.any(Object),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminId,
            action: 'USER_ACCOUNT_REACTIVATED',
            entityType: 'User',
            entityId: targetUserId,
            metadata: expect.objectContaining({
              outcome: 'SUCCESS',
              reason: 'Account reinstated upon review',
            }),
          }),
        }),
      );
      expect(result.isActive).toBe(true);
    });
  });

  // =========================================================================
  // 3. COURSE MODERATION & REVIEW
  // =========================================================================
  describe('Course Moderation (getCoursesForModeration, getCourseForReview, moderateCourse)', () => {
    const adminId = 'admin-uuid-1';
    const courseId = 'course-uuid-1';
    const mockCourse = {
      id: courseId,
      title: 'Advanced Machine Learning',
      status: CourseStatus.PENDING_REVIEW,
      authorId: 'author-uuid-1',
    };

    it('should throw NotFoundException if course to review does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(service.getCourseForReview('missing-course')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return complete course curriculum tree for review', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        title: 'Advanced Machine Learning',
        sections: [
          {
            id: 'sec-1',
            title: 'Neural Networks',
            lessons: [{ id: 'les-1', title: 'Perceptrons', quiz: null, assignment: null }],
          },
        ],
        _count: { enrollments: 0, reviews: 0, certificates: 0 },
      });

      const res = await service.getCourseForReview(courseId);
      expect(res.id).toBe(courseId);
      expect(res.sections).toHaveLength(1);
    });

    it('should approve course, publish it, audit action and notify author', async () => {
      prisma.course.findUnique.mockResolvedValue(mockCourse);
      prisma.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.moderateCourse(adminId, courseId, {
        action: ModerationAction.APPROVE,
      });

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: CourseStatus.PUBLISHED },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminId,
            action: 'COURSE_APPROVED',
            entityType: 'Course',
            entityId: courseId,
            metadata: expect.objectContaining({
              outcome: 'SUCCESS',
              action: ModerationAction.APPROVE,
              courseTitle: mockCourse.title,
            }),
          }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockCourse.authorId,
            title: 'Course Approved & Published',
          }),
        }),
      );
      expect(result.status).toBe(CourseStatus.PUBLISHED);
    });

    it('should throw BadRequestException if course is rejected without a reason', async () => {
      prisma.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.moderateCourse(adminId, courseId, {
          action: ModerationAction.REJECT,
          feedback: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject course, revert to DRAFT with reason, audit action and notify author', async () => {
      prisma.course.findUnique.mockResolvedValue(mockCourse);
      prisma.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.DRAFT,
      });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.moderateCourse(adminId, courseId, {
        action: ModerationAction.REJECT,
        reason: 'Syllabus missing hands-on programming labs in Section 2',
      });

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: CourseStatus.DRAFT },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminId,
            action: 'COURSE_REJECTED',
            entityType: 'Course',
            entityId: courseId,
            metadata: expect.objectContaining({
              outcome: 'SUCCESS',
              reason: 'Syllabus missing hands-on programming labs in Section 2',
            }),
          }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockCourse.authorId,
            title: 'Course Requires Revision',
            message: expect.stringContaining('Syllabus missing hands-on programming labs in Section 2'),
          }),
        }),
      );
      expect(result.status).toBe(CourseStatus.DRAFT);
    });
  });

  // =========================================================================
  // 4. CONTENT MODERATION (REVIEWS)
  // =========================================================================
  describe('Content Moderation (getReviewsForModeration, moderateReview)', () => {
    const adminId = 'admin-uuid-1';
    const reviewId = 'review-uuid-1';

    it('should list user reviews with pagination', async () => {
      prisma.review.count.mockResolvedValue(1);
      prisma.review.findMany.mockResolvedValue([
        {
          id: reviewId,
          rating: 1,
          comment: 'Inappropriate spam comment',
          user: { id: 'u1', fullName: 'Spammer', email: 'spam@eduverse.et' },
          course: { id: 'c1', title: 'Web Development', slug: 'web-dev' },
        },
      ]);

      const res = await service.getReviewsForModeration({ page: 1, limit: 10 });
      expect(res.total).toBe(1);
      expect(res.reviews[0]!.rating).toBe(1);
    });

    it('should throw NotFoundException if review does not exist', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.moderateReview(adminId, 'missing-rev', { reason: 'Spam' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if moderation reason is empty', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: reviewId,
        userId: 'u1',
        courseId: 'c1',
        user: { email: 'u1@eduverse.et' },
        course: { title: 'Web Dev' },
      });

      await expect(
        service.moderateReview(adminId, reviewId, { reason: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete offending review, record audit log with reason, and notify author', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: reviewId,
        userId: 'u1',
        courseId: 'c1',
        rating: 1,
        comment: 'Spam advertisement for third-party links',
        user: { email: 'u1@eduverse.et' },
        course: { title: 'Web Development' },
      });
      prisma.review.delete.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const res = await service.moderateReview(adminId, reviewId, {
        reason: 'Violated community spam policies',
      });

      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: reviewId } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminId,
            action: 'REVIEW_MODERATED',
            entityType: 'Review',
            entityId: reviewId,
            metadata: expect.objectContaining({
              outcome: 'SUCCESS',
              reason: 'Violated community spam policies',
            }),
          }),
        }),
      );
      expect(res.success).toBe(true);
    });
  });

  // =========================================================================
  // 5. INSTITUTION ADMINISTRATION
  // =========================================================================
  describe('Institution Administration', () => {
    const adminId = 'admin-uuid-1';
    const instId = 'inst-uuid-1';

    it('should throw ConflictException if slug already exists', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createInstitution(adminId, {
          name: 'Addis Ababa University',
          slug: 'aau',
          contactEmail: 'contact@aau.edu.et',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create institution and record audit log', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);
      prisma.institution.create.mockResolvedValue({
        id: instId,
        name: 'Hawassa University',
        slug: 'hu',
        contactEmail: 'contact@hu.edu.et',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.createInstitution(adminId, {
        name: 'Hawassa University',
        slug: 'hu',
        contactEmail: 'contact@hu.edu.et',
      });

      expect(prisma.institution.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTITUTION_CREATED',
            entityType: 'Institution',
            metadata: expect.objectContaining({ outcome: 'SUCCESS' }),
          }),
        }),
      );
      expect(res.id).toBe(instId);
    });

    it('should update institution profile and audit change', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: instId, name: 'AAU' });
      prisma.institution.update.mockResolvedValue({ id: instId, name: 'Addis Ababa University' });
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.updateInstitution(adminId, instId, {
        name: 'Addis Ababa University',
      });

      expect(prisma.institution.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTITUTION_UPDATED',
            entityType: 'Institution',
          }),
        }),
      );
      expect(res.name).toBe('Addis Ababa University');
    });

    it('should toggle institution active status and audit change', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: instId, name: 'AAU', isActive: true });
      prisma.institution.update.mockResolvedValue({ id: instId, name: 'AAU', isActive: false });
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.setInstitutionStatus(adminId, instId, false, 'Temporary accreditation audit');

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: instId },
        data: { isActive: false },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTITUTION_STATUS_CHANGED',
            metadata: expect.objectContaining({
              outcome: 'SUCCESS',
              newStatus: false,
              reason: 'Temporary accreditation audit',
            }),
          }),
        }),
      );
      expect(res.isActive).toBe(false);
    });
  });

  // =========================================================================
  // 6. GLOBAL PLATFORM SETTINGS
  // =========================================================================
  describe('Global Platform Settings', () => {
    const adminId = 'admin-uuid-1';

    it('should return platform configuration and audit setting updates', async () => {
      const initial = service.getSettings();
      expect(initial.platformName).toContain('EduVerse');

      prisma.auditLog.create.mockResolvedValue({});

      const updated = await service.updateSettings(adminId, {
        maintenanceMode: true,
        maxUploadSizeMb: 100,
      });

      expect(updated.maintenanceMode).toBe(true);
      expect(updated.maxUploadSizeMb).toBe(100);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PLATFORM_SETTINGS_UPDATED',
            entityType: 'PlatformSettings',
            metadata: expect.objectContaining({
              maintenanceMode: true,
              maxUploadSizeMb: 100,
              outcome: 'SUCCESS',
            }),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // 7. AUDIT TRAIL INSPECTION & SANITIZATION
  // =========================================================================
  describe('Audit Trail Inspection & Sanitization', () => {
    it('should return paginated audit logs with metadata, date range filters, and total count', async () => {
      prisma.auditLog.count.mockResolvedValue(45);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'USER_ROLE_ASSIGNED',
          entityType: 'User',
          entityId: 'u-1',
          createdAt: new Date(),
          metadata: { outcome: 'SUCCESS' },
          user: { id: 'admin-1', fullName: 'Super Admin', email: 'admin@eduverse.et' },
        },
      ]);

      const res = await service.getAuditLogs({
        page: 1,
        limit: 10,
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        search: 'USER',
      });

      expect(res.total).toBe(45);
      expect(res.totalPages).toBe(5);
      expect(res.logs).toHaveLength(1);
    });

    it('should retrieve a single audit log entry by ID or throw NotFoundException', async () => {
      prisma.auditLog.findUnique.mockResolvedValueOnce(null);
      await expect(service.getAuditLogById('missing-log')).rejects.toThrow(NotFoundException);

      prisma.auditLog.findUnique.mockResolvedValueOnce({
        id: 'log-1',
        action: 'COURSE_APPROVED',
        entityType: 'Course',
        entityId: 'c-1',
        metadata: { outcome: 'SUCCESS' },
      });

      const res = await service.getAuditLogById('log-1');
      expect(res.id).toBe('log-1');
      expect(res.action).toBe('COURSE_APPROVED');
    });

    it('should sanitize metadata to prevent passwords, tokens, and secrets from leaking into audit logs', async () => {
      prisma.auditLog.create.mockResolvedValue({});

      await service.recordAuditLog({
        actorId: 'admin-1',
        action: 'SECURITY_TEST',
        entityType: 'Security',
        entityId: 'sec-1',
        metadata: {
          password: 'SecretPassword123!',
          passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
          refreshToken: 'secret-refresh-token',
          accessToken: 'secret-access-token',
          authorization: 'Bearer secret-jwt',
          safeField: 'Safe Value',
        },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              safeField: 'Safe Value',
              outcome: 'SUCCESS',
            }),
          }),
        }),
      );

      const capturedCall = prisma.auditLog.create.mock.calls[0]![0];
      const metadata = capturedCall.data.metadata;
      expect(metadata.password).toBeUndefined();
      expect(metadata.passwordHash).toBeUndefined();
      expect(metadata.refreshToken).toBeUndefined();
      expect(metadata.accessToken).toBeUndefined();
      expect(metadata.authorization).toBeUndefined();
    });
  });
});
