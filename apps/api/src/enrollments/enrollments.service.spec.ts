import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from './enrollments.service';
import { PrismaService } from '../database/prisma.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let prisma: any;

  const studentA = 'student-uuid-aaa';
  const studentB = 'student-uuid-bbb';

  beforeEach(async () => {
    prisma = {
      enrollment: {
        findMany: jest.fn(),
        count: jest.fn(),
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
});

