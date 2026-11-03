import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService, CourseStatus } from '../database/prisma.service';
import { ModerationAction } from './dto/moderate-course.dto';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        count: jest.fn(),
        groupBy: jest.fn(),
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

  describe('getOverview', () => {
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
      expect(overview.institutions.total).toBe(4);
      expect(overview.courses.published).toBe(25);
      expect(overview.courses.pendingReview).toBe(3);
      expect(overview.enrollments.total).toBe(340);
      expect(overview.system.status).toBe('HEALTHY');
    });
  });

  describe('moderateCourse', () => {
    const adminId = 'admin-uuid-1';
    const courseId = 'course-uuid-1';
    const mockCourse = {
      id: courseId,
      title: 'Advanced Machine Learning',
      status: CourseStatus.PENDING_REVIEW,
      authorId: 'author-uuid-1',
    };

    it('should throw NotFoundException if course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.moderateCourse(adminId, courseId, {
          action: ModerationAction.APPROVE,
        }),
      ).rejects.toThrow(NotFoundException);
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
            action: 'COURSE_MODERATED',
            entityType: 'Course',
            entityId: courseId,
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

    it('should reject course, revert to DRAFT with feedback and notify author', async () => {
      prisma.course.findUnique.mockResolvedValue(mockCourse);
      prisma.course.update.mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.DRAFT,
      });
      prisma.auditLog.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.moderateCourse(adminId, courseId, {
        action: ModerationAction.REJECT,
        feedback: 'Incomplete syllabus in section 3',
      });

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: { status: CourseStatus.DRAFT },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockCourse.authorId,
            title: 'Course Requires Revision',
            message: expect.stringContaining('Incomplete syllabus in section 3'),
          }),
        }),
      );
      expect(result.status).toBe(CourseStatus.DRAFT);
    });
  });

  describe('createInstitution', () => {
    it('should throw ConflictException if slug already exists', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createInstitution('admin-id', {
          name: 'Addis Ababa University',
          slug: 'aau',
          contactEmail: 'contact@aau.edu.et',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create institution and record audit log', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);
      prisma.institution.create.mockResolvedValue({
        id: 'new-inst-id',
        name: 'Hawassa University',
        slug: 'hu',
        contactEmail: 'contact@hu.edu.et',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.createInstitution('admin-id', {
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
          }),
        }),
      );
      expect(res.id).toBe('new-inst-id');
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs with metadata and total count', async () => {
      prisma.auditLog.count.mockResolvedValue(45);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'USER_ROLE_ASSIGNED',
          entityType: 'User',
          entityId: 'u-1',
          createdAt: new Date(),
          user: { id: 'admin-1', fullName: 'Super Admin', email: 'admin@eduverse.et' },
        },
      ]);

      const res = await service.getAuditLogs({ page: 1, limit: 10 });

      expect(res.total).toBe(45);
      expect(res.totalPages).toBe(5);
      expect(res.logs.length).toBe(1);
    });
  });
});

