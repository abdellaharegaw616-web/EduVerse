import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
        expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
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

