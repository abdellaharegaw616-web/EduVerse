import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService, Role, CourseDifficulty, CourseStatus, AiMessageRole } from '../database/prisma.service';
import { AiTutorMode, AiTutorLanguage } from './dto/ask-tutor.dto';

describe('AiService (Academic AI Tutor & Co-Author)', () => {
  let service: AiService;
  let prisma: any;
  let configValues: Record<string, string>;

  const studentId = 'student-1';
  const teacherId = 'teacher-1';
  const courseId = 'course-1';
  const lessonId = 'lesson-1';

  const mockLesson = {
    id: lessonId,
    title: 'Database Indexing & Query Planning',
    slug: 'database-indexing',
    isFreePreview: false,
    content: `# B-Tree Indexes in PostgreSQL
- Composite indexes improve multi-column WHERE lookups cleanly.
- Explain Analyze measures actual execution cost versus sequential scans.
Regular vacuuming keeps statistics accurate for the query planner.`,
    section: {
      id: 'sec-1',
      title: 'Relational Storage Internals',
      course: {
        id: courseId,
        title: 'Backend Engineering with PostgreSQL',
        description: 'Production database design.',
        status: CourseStatus.PUBLISHED,
        authorId: teacherId,
        learningObjectives: ['Design composite indexes', 'Interpret EXPLAIN ANALYZE'],
      },
    },
  };

  beforeEach(async () => {
    configValues = {
      'ai.provider': 'auto',
      'ai.geminiApiKey': '',
      'ai.geminiModel': 'gemini-2.5-flash',
      'ai.openaiApiKey': '',
      'ai.openaiBaseUrl': 'https://api.openai.com/v1',
      'ai.openaiModel': 'gpt-4o-mini',
    };

    prisma = {
      user: { findUnique: jest.fn() },
      lesson: { findUnique: jest.fn() },
      course: { findUnique: jest.fn() },
      enrollment: { findUnique: jest.fn() },
      assignmentSubmission: { findUnique: jest.fn() },
      aiTutorMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((args: any) => ({
          id: `msg-${Math.random()}`,
          createdAt: new Date(),
          ...args.data,
        })),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn((ops: Promise<any>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) =>
              key in configValues ? configValues[key] : defaultVal,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Engine Status & Provider Detection', () => {
    it('should report contextual-offline when no API keys are configured', () => {
      const status = service.getStatus();
      expect(status.available).toBe(true);
      expect(status.activeEngine).toBe('contextual-offline');
      expect(status.configuredProviders).toEqual({ gemini: false, openai: false });
    });

    it('should prioritize gemini when GEMINI_API_KEY is present in auto mode', () => {
      configValues['ai.geminiApiKey'] = 'mock-gemini-key';
      const status = service.getStatus();
      expect(status.activeEngine).toBe('gemini');
      expect(status.model).toBe('gemini-2.5-flash');
      expect(status.configuredProviders.gemini).toBe(true);
    });

    it('should use openai when only OPENAI_API_KEY is set', () => {
      configValues['ai.openaiApiKey'] = 'mock-openai-key';
      const status = service.getStatus();
      expect(status.activeEngine).toBe('openai');
      expect(status.model).toBe('gpt-4o-mini');
      expect(status.configuredProviders.openai).toBe(true);
    });
  });

  describe('Student AI Study Tutor', () => {
    it('should deny suspended accounts from querying the tutor', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: false,
        role: Role.STUDENT,
      });

      await expect(
        service.askTutor(studentId, { question: 'Explain indexes' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny un-enrolled student from querying private lesson tutor context', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: true,
        role: Role.STUDENT,
      });
      prisma.lesson.findUnique.mockResolvedValue(mockLesson);
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.askTutor(studentId, {
          question: 'Summarize this lesson',
          lessonId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should answer grounded in lesson content in offline mode and persist conversation', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        fullName: 'Almaz Tadesse',
        isActive: true,
        role: Role.STUDENT,
      });
      prisma.lesson.findUnique.mockResolvedValue(mockLesson);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const res = await service.askTutor(studentId, {
        question: 'Summarize this lesson',
        lessonId,
        mode: AiTutorMode.SUMMARY,
        language: AiTutorLanguage.BILINGUAL,
      });

      expect(res.engine).toBe('contextual-offline');
      expect(res.assistantMessage.role).toBe(AiMessageRole.ASSISTANT);
      expect(res.assistantMessage.content).toContain('Database Indexing & Query Planning');
      expect(res.assistantMessage.content).toContain('Amharic Study Note');
      expect(prisma.aiTutorMessage.create).toHaveBeenCalledTimes(2);
    });

    it('should call Gemini HTTP API when configured and fall back gracefully on HTTP failure', async () => {
      configValues['ai.geminiApiKey'] = 'test-gemini-key';

      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: true,
        role: Role.STUDENT,
      });
      prisma.lesson.findUnique.mockResolvedValue({ ...mockLesson, isFreePreview: true });

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Gemini explanation of composite B-Tree indexes.' }],
              },
            },
          ],
        }),
      } as any);

      const liveRes = await service.askTutor(studentId, {
        question: 'Why use composite indexes?',
        lessonId,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(liveRes.engine).toBe('gemini');
      expect(liveRes.assistantMessage.content).toContain('Gemini explanation');

      // Now simulate upstream timeout/failure -> automatic fallback
      fetchSpy.mockRejectedValueOnce(new Error('Network timeout'));

      const fallbackRes = await service.askTutor(studentId, {
        question: 'Create flashcards',
        lessonId,
        mode: AiTutorMode.FLASHCARDS,
      });

      expect(fallbackRes.engine).toBe('contextual-offline');
      expect(fallbackRes.assistantMessage.content).toContain('Revision Flashcards');
    });

    it('should retrieve and clear user tutor history strictly scoped to userId', async () => {
      prisma.aiTutorMessage.findMany.mockResolvedValue([
        { id: 'm1', role: AiMessageRole.USER, content: 'Hi' },
      ]);

      const history = await service.getTutorHistory(studentId, courseId, lessonId);
      expect(history).toHaveLength(1);
      expect(prisma.aiTutorMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: studentId, lessonId } }),
      );

      const cleared = await service.clearTutorHistory(studentId, courseId, lessonId);
      expect(cleared.deletedCount).toBe(2);
    });

    it('should gracefully provide study assistance even if database table persistence fails (unmigrated DB)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentId, isActive: true, role: Role.STUDENT });
      prisma.lesson.findUnique.mockResolvedValue(mockLesson);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      // Simulate missing database table throwing P2021
      prisma.aiTutorMessage.findMany.mockRejectedValueOnce(new Error('Table public.AiTutorMessage does not exist'));
      prisma.$transaction.mockRejectedValueOnce(new Error('Table public.AiTutorMessage does not exist'));

      const result = await service.askTutor(studentId, {
        question: 'Explain indexes in simple terms',
        lessonId,
        mode: AiTutorMode.EXPLAIN_SIMPLE,
      });

      expect(result).toBeDefined();
      expect(result.assistantMessage).toBeDefined();
      expect(result.assistantMessage.content).toBeTruthy();
      expect(result.userMessage.content).toBe('Explain indexes in simple terms');
    });

    it('should safely handle courses with undefined or empty learning objectives without throwing slice error', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentId, isActive: true, role: Role.STUDENT });
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        title: 'Python for Beginners',
        description: null,
        status: CourseStatus.PUBLISHED,
        authorId: teacherId,
        learningObjectives: null, // null from database
        sections: [
          {
            title: 'Getting Started',
            lessons: [{ title: 'Variables' }],
          },
        ],
      });

      const result = await service.askTutor(studentId, {
        question: 'Give me a summary',
        courseId,
        mode: AiTutorMode.SUMMARY,
      });

      expect(result).toBeDefined();
      expect(result.assistantMessage.content).toContain('Study Summary');
    });

    it('should catch unexpected exceptions and return a graceful academic guidance fallback instead of throwing 500', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentId, isActive: true, role: Role.STUDENT });
      // Simulate unexpected database crash during course lookup
      prisma.course.findUnique.mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));

      const result = await service.askTutor(studentId, {
        question: 'How do neural networks learn?',
        courseId,
      });

      expect(result).toBeDefined();
      expect(result.assistantMessage.content).toContain('Academic Guidance');
      expect(result.engine).toBe('contextual-offline');
    });

    it('should generate grounded practice questions with answer keys in PRACTICE_QUESTIONS mode', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentId, isActive: true, role: Role.STUDENT });
      prisma.lesson.findUnique.mockResolvedValue(mockLesson);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const result = await service.askTutor(studentId, {
        question: 'Generate test questions on indexing',
        lessonId,
        mode: AiTutorMode.PRACTICE_QUESTIONS,
      });

      expect(result).toBeDefined();
      expect(result.assistantMessage.content).toContain('Grounded Practice Questions');
      expect(result.assistantMessage.content).toContain('Answer Key & Explanations');
      expect(result.assistantMessage.content).toContain('Rationale:');
      expect(result.quota).toBeDefined();
      expect(result.quota.remaining).toBe(49);
    });

    it('should provide Socratic hints and refuse to give direct answers in HINTS mode', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentId, isActive: true, role: Role.STUDENT });
      prisma.lesson.findUnique.mockResolvedValue(mockLesson);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const result = await service.askTutor(studentId, {
        question: 'What is the answer to question 3 on the homework?',
        lessonId,
        mode: AiTutorMode.HINTS,
      });

      expect(result).toBeDefined();
      expect(result.assistantMessage.content).toContain('Socratic Assignment Guidance');
      expect(result.assistantMessage.content).toContain('Academic Integrity Notice');
      expect(result.assistantMessage.content).toContain('does not provide direct homework answers');
      expect(result.assistantMessage.content).toContain('Progressive Hints');
    });

    it('should enforce daily quota limits and reject requests when daily limit is exceeded', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: studentId, isActive: true, role: Role.STUDENT });
      prisma.aiTutorMessage.count.mockResolvedValueOnce(50); // Student limit is 50

      await expect(
        service.askTutor(studentId, {
          question: 'Can you help me?',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate accurate quota limits for students (50) and teachers (200)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: studentId, role: Role.STUDENT });
      prisma.aiTutorMessage.count.mockResolvedValueOnce(15);

      const studentQuota = await service.getTutorQuota(studentId);
      expect(studentQuota.dailyLimit).toBe(50);
      expect(studentQuota.usedToday).toBe(15);
      expect(studentQuota.remaining).toBe(35);

      prisma.user.findUnique.mockResolvedValueOnce({ id: teacherId, role: Role.TEACHER });
      prisma.aiTutorMessage.count.mockResolvedValueOnce(20);

      const teacherQuota = await service.getTutorQuota(teacherId);
      expect(teacherQuota.dailyLimit).toBe(200);
      expect(teacherQuota.usedToday).toBe(20);
      expect(teacherQuota.remaining).toBe(180);
    });
  });

  describe('Instructor Co-Author Tools', () => {
    it('should reject quiz generation if caller does not own the course', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'other-teacher', isActive: true });
      prisma.lesson.findUnique.mockResolvedValue(mockLesson);

      await expect(
        service.generateQuizQuestions('other-teacher', false, { lessonId, questionCount: 3 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should generate structured MCQ draft questions for course owner', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: teacherId, isActive: true });
      prisma.lesson.findUnique.mockResolvedValue(mockLesson);

      const result = await service.generateQuizQuestions(teacherId, false, {
        lessonId,
        questionCount: 3,
        difficulty: CourseDifficulty.INTERMEDIATE,
      });

      expect(result.questions).toHaveLength(3);
      for (const q of result.questions) {
        expect(q.options).toHaveLength(4);
        expect(q.options.filter((o: any) => o.isCorrect)).toHaveLength(1);
      }
    });

    it('should draft constructive assignment feedback for submission owner', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: teacherId, isActive: true });
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        grade: 92,
        content: 'Implemented B-Tree composite indexes and EXPLAIN ANALYZE benchmarks.',
        fileUrl: 'https://github.com/student/repo',
        user: { id: studentId, fullName: 'Almaz Tadesse' },
        assignment: {
          title: 'Query Optimization Lab',
          instructions: 'Benchmark queries before and after indexing.',
          maxScore: 100,
          lesson: {
            section: {
              course: { id: courseId, title: 'Backend DBs', authorId: teacherId },
            },
          },
        },
      });

      const draft = await service.draftAssignmentFeedback(teacherId, false, {
        submissionId: 'sub-1',
        proposedGrade: 92,
      });

      expect(draft.draftFeedback).toContain('Almaz Tadesse');
      expect(draft.draftFeedback).toContain('92/100');
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: teacherId, isActive: true });
      prisma.assignmentSubmission.findUnique.mockResolvedValue(null);

      await expect(
        service.draftAssignmentFeedback(teacherId, false, { submissionId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate a structured course outline from a topic prompt', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: teacherId, isActive: true });

      const outline = await service.generateCourseOutline(teacherId, {
        topic: 'Cloud Architecture in Ethiopia',
        difficulty: CourseDifficulty.BEGINNER,
        sectionCount: 3,
      });

      expect(outline.title).toContain('Cloud Architecture in Ethiopia');
      expect(outline.sections).toHaveLength(3);
      expect(outline.learningObjectives.length).toBeGreaterThan(0);
    });
  });
});

