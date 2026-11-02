import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsService } from './assessments.service';
import { PrismaService } from '../database/prisma.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let prisma: any;

  const studentA = 'student-uuid-aaa';

  beforeEach(async () => {
    prisma = {
      quizAttempt: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  describe('getMyQuizzes', () => {
    it('should query quiz attempts strictly for the given student user', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          quizId: 'quiz-1',
          score: 85,
          passed: true,
          attemptedAt: new Date(),
          quiz: {
            title: 'TypeScript Type Narrowing',
            passingScore: 75,
            lesson: {
              title: 'Lesson 4: Unions and Guards',
              section: {
                course: {
                  id: 'course-1',
                  title: 'TypeScript Advanced',
                  slug: 'typescript-advanced',
                },
              },
            },
          },
        },
      ];

      prisma.quizAttempt.findMany.mockResolvedValue(mockAttempts);

      const results = await service.getMyQuizzes(studentA);

      expect(prisma.quizAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: studentA },
        }),
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.score).toBe(85);
      expect(results[0]?.passingScore).toBe(75);
    });
  });
});

