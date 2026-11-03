import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsService } from './assessments.service';
import { PrismaService } from '../database/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('AssessmentsService (Phase 8D: Quizzes and Examinations)', () => {
  let service: AssessmentsService;
  let prisma: any;

  const mockActiveStudent = {
    id: 'student-1',
    email: 'student@eduverse.et',
    isActive: true,
    role: 'STUDENT',
  };

  const mockSuspendedStudent = {
    id: 'suspended-1',
    email: 'banned@eduverse.et',
    isActive: false,
    role: 'STUDENT',
  };

  const mockQuiz = {
    id: 'quiz-1',
    title: 'Cloud Architecture & Networking Quiz',
    lessonId: 'lesson-1',
    passingScore: 70,
    timeLimitMinutes: 30,
    attemptLimit: 3,
    lesson: {
      id: 'lesson-1',
      title: 'VPC Architecture',
      section: {
        id: 'sec-1',
        courseId: 'course-1',
        course: {
          id: 'course-1',
          title: 'Cloud Computing in Addis Ababa',
          slug: 'cloud-computing-addis',
          authorId: 'teacher-1',
        },
      },
    },
    questions: [
      {
        id: 'q1',
        text: 'What does VPC stand for?',
        type: 'MULTIPLE_CHOICE',
        points: 10,
        sortOrder: 1,
        options: [
          { id: 'opt-1', text: 'Virtual Private Cloud', isCorrect: true },
          { id: 'opt-2', text: 'Variable Public Cluster', isCorrect: false },
        ],
      },
      {
        id: 'q2',
        text: 'Security groups are stateful firewalls in AWS.',
        type: 'TRUE_FALSE',
        points: 10,
        sortOrder: 2,
        options: [
          { id: 'opt-3', text: 'True', isCorrect: true },
          { id: 'opt-4', text: 'False', isCorrect: false },
        ],
      },
      {
        id: 'q3',
        text: 'What is the capital city of Ethiopia?',
        type: 'SHORT_ANSWER',
        points: 20,
        sortOrder: 3,
        options: [
          { id: 'opt-5', text: 'Addis Ababa', isCorrect: true },
        ],
      },
    ],
    attempts: [],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      quiz: {
        findUnique: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
      },
      quizAttempt: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  describe('1. Security & Answer Key Protection', () => {
    it('should NEVER send correct answers (isCorrect) to the student before submission', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue({
        ...mockQuiz,
        questions: mockQuiz.questions.map((q) => ({
          ...q,
          options: q.options.map(({ id, text }) => ({ id, text })), // Sanitized projection
        })),
      });
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const quizData = await service.getQuizForStudent('student-1', 'quiz-1');

      expect(quizData).toBeDefined();
      expect(quizData.questions).toHaveLength(3);

      // Verify no option contains isCorrect property
      quizData.questions.forEach((q) => {
        q.options.forEach((opt: any) => {
          expect(opt.isCorrect).toBeUndefined();
        });
      });
    });

    it('should reject quiz access if student is not enrolled (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
      prisma.enrollment.findUnique.mockResolvedValue(null); // Not enrolled

      await expect(
        service.getQuizForStudent('student-1', 'quiz-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject quiz access if student account is suspended (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockSuspendedStudent);

      await expect(
        service.getQuizForStudent('suspended-1', 'quiz-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.getQuizForStudent('student-1', 'non-existent-quiz'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Automated Grading & Score Calculation', () => {
    it('should score 100% and pass when all answers (multiple choice, true/false, short answer) are correct', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.quizAttempt.count.mockResolvedValue(0);

      const mockCreatedAttempt = {
        id: 'attempt-1',
        quizId: 'quiz-1',
        score: 100,
        passed: true,
        attemptedAt: new Date(),
      };
      prisma.quizAttempt.create.mockResolvedValue(mockCreatedAttempt);

      const submission = {
        answers: [
          { questionId: 'q1', selectedOptionId: 'opt-1' }, // Correct MC
          { questionId: 'q2', selectedOptionId: 'opt-3' }, // Correct TF
          { questionId: 'q3', textAnswer: 'Addis Ababa' }, // Correct Short Answer
        ],
        startedAt: new Date().toISOString(),
      };

      const result = await service.submitQuiz('student-1', 'quiz-1', submission);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.earnedPoints).toBe(40);
      expect(result.totalPoints).toBe(40);
      expect(result.attemptNumber).toBe(1);
      expect(result.remainingAttempts).toBe(2);
      expect(prisma.quizAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 100, passed: true }),
        }),
      );
    });

    it('should score 0% and fail when all answers are incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.quizAttempt.count.mockResolvedValue(0);

      prisma.quizAttempt.create.mockResolvedValue({
        id: 'attempt-2',
        score: 0,
        passed: false,
        attemptedAt: new Date(),
      });

      const submission = {
        answers: [
          { questionId: 'q1', selectedOptionId: 'opt-2' }, // Wrong MC
          { questionId: 'q2', selectedOptionId: 'opt-4' }, // Wrong TF
          { questionId: 'q3', textAnswer: 'Nairobi' }, // Wrong Short Answer
        ],
      };

      const result = await service.submitQuiz('student-1', 'quiz-1', submission);

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.earnedPoints).toBe(0);
      expect(result.totalPoints).toBe(40);
    });

    it('should compute partial grade accurately with case-insensitive short answers', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.quizAttempt.count.mockResolvedValue(1);

      prisma.quizAttempt.create.mockResolvedValue({
        id: 'attempt-3',
        score: 75,
        passed: true,
        attemptedAt: new Date(),
      });

      // q1 (10 pts) correct, q2 (10 pts) wrong, q3 (20 pts) correct -> 30/40 = 75%
      const submission = {
        answers: [
          { questionId: 'q1', selectedOptionId: 'opt-1' }, // 10 pts
          { questionId: 'q2', selectedOptionId: 'opt-4' }, // 0 pts
          { questionId: 'q3', textAnswer: '  addis ababa  ' }, // 20 pts (trimmed & lowercase match)
        ],
      };

      const result = await service.submitQuiz('student-1', 'quiz-1', submission);

      expect(result.score).toBe(75);
      expect(result.passed).toBe(true); // passingScore = 70
      expect(result.earnedPoints).toBe(30);
      expect(result.totalPoints).toBe(40);
      expect(result.attemptNumber).toBe(2);
      expect(result.remainingAttempts).toBe(1);
    });
  });

  describe('3. Attempt Limits & Time Limit Validation', () => {
    it('should reject submission if attempt limit is exceeded (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(mockQuiz); // attemptLimit = 3
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.quizAttempt.count.mockResolvedValue(3); // Already 3 attempts

      await expect(
        service.submitQuiz('student-1', 'quiz-1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if quiz time limit has expired (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(mockQuiz); // timeLimitMinutes = 30
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.quizAttempt.count.mockResolvedValue(0);

      // Started 45 minutes ago (30 min limit + 1 min grace = max 31 min)
      const expiredStartTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();

      await expect(
        service.submitQuiz('student-1', 'quiz-1', {
          answers: [{ questionId: 'q1', selectedOptionId: 'opt-1' }],
          startedAt: expiredStartTime,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if answer references non-existent question ID (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.quiz.findUnique.mockResolvedValue(mockQuiz);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.quizAttempt.count.mockResolvedValue(0);

      await expect(
        service.submitQuiz('student-1', 'quiz-1', {
          answers: [{ questionId: 'fake-invalid-question-id', selectedOptionId: 'opt-1' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Attempt Details & History Ownership', () => {
    it('should enforce attempt ownership: reject cross-user access to attempt details (403 Forbidden)', async () => {
      prisma.quizAttempt.findUnique.mockResolvedValue({
        id: 'attempt-99',
        userId: 'student-other',
        quiz: mockQuiz,
      });

      await expect(
        service.getAttemptDetails('student-1', 'attempt-99'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return attempt details to the rightful attempt owner', async () => {
      const mockAttempt = {
        id: 'attempt-100',
        userId: 'student-1',
        score: 90,
        passed: true,
        quiz: mockQuiz,
      };
      prisma.quizAttempt.findUnique.mockResolvedValue(mockAttempt);

      const details = await service.getAttemptDetails('student-1', 'attempt-100');
      expect(details).toBeDefined();
      expect(details.id).toBe('attempt-100');
      expect(details.score).toBe(90);
    });
  });
});
