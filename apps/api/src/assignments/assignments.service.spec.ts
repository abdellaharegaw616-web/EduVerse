import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../database/prisma.service';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: any;

  const studentA = 'student-uuid-aaa';
  const studentB = 'student-uuid-bbb';

  beforeEach(async () => {
    prisma = {
      assignment: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  describe('getMyAssignments', () => {
    it('should query only enrolled courses for the student and map submissions', async () => {
      const mockAssignments = [
        {
          id: 'assign-1',
          title: 'Monorepo Setup Exercise',
          instructions: 'Configure pnpm-workspace.yaml',
          maxScore: 100,
          dueDate: new Date(),
          lesson: {
            title: 'Lesson 1',
            section: {
              course: {
                id: 'course-1',
                title: 'Full-Stack Distributed Systems',
                slug: 'full-stack-distributed-systems',
              },
            },
          },
          submissions: [
            {
              status: 'GRADED',
              grade: 98,
              feedback: 'Outstanding architecture and clean tests.',
              submittedAt: new Date(),
              gradedAt: new Date(),
            },
          ],
        },
      ];

      prisma.assignment.findMany.mockResolvedValue(mockAssignments);

      const result = await service.getMyAssignments(studentA);

      expect(prisma.assignment.findMany).toHaveBeenCalledWith({
        where: {
          lesson: {
            section: {
              course: {
                enrollments: { some: { userId: studentA } },
              },
            },
          },
        },
        include: {
          lesson: {
            include: {
              section: {
                include: {
                  course: {
                    select: { id: true, title: true, slug: true },
                  },
                },
              },
            },
          },
          submissions: {
            where: { userId: studentA },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('GRADED');
      expect(result[0]?.grade).toBe(98);
      expect(result[0]?.feedback).toBe('Outstanding architecture and clean tests.');
    });

    it('should return PENDING status when student has no submission for an assignment', async () => {
      const mockAssignments = [
        {
          id: 'assign-2',
          title: 'Database Indexing',
          instructions: 'Index optimization',
          maxScore: 50,
          dueDate: new Date(),
          lesson: {
            title: 'Lesson 2',
            section: {
              course: {
                id: 'course-2',
                title: 'PostgreSQL Mastery',
                slug: 'postgresql-mastery',
              },
            },
          },
          submissions: [],
        },
      ];

      prisma.assignment.findMany.mockResolvedValue(mockAssignments);

      const result = await service.getMyAssignments(studentB);

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('PENDING');
      expect(result[0]?.grade).toBeNull();
    });
  });
});

