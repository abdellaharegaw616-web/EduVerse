import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PrismaService,
  Role,
  CourseStatus,
  CourseDifficulty,
  AiMessageRole,
} from '../database/prisma.service';
import { AskTutorDto, AiTutorMode, AiTutorLanguage } from './dto/ask-tutor.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { DraftFeedbackDto } from './dto/draft-feedback.dto';
import { GenerateOutlineDto } from './dto/generate-outline.dto';

export interface GeneratedQuizOption {
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuizQuestion {
  text: string;
  points: number;
  options: GeneratedQuizOption[];
}

export interface GeneratedCourseOutline {
  title: string;
  description: string;
  difficulty: CourseDifficulty;
  estimatedHours: number;
  learningObjectives: string[];
  prerequisites: string[];
  sections: Array<{
    title: string;
    lessons: string[];
  }>;
  engine: string;
  model: string;
}

interface AcademicContext {
  courseId?: string;
  lessonId?: string;
  courseTitle?: string;
  courseDescription?: string;
  learningObjectives: string[];
  sectionTitle?: string;
  lessonTitle?: string;
  lessonContent?: string;
  syllabusOutline?: string[];
}

interface LlmCompletionResult {
  text: string;
  engine: 'gemini' | 'openai' | 'contextual-offline';
  model: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------
  // 1. ENGINE STATUS & PROVIDER RESOLUTION
  // -------------------------------------------------------------

  getStatus() {
    const providerPref = (this.config.get<string>('ai.provider') || 'auto').toLowerCase();
    const geminiKey = (this.config.get<string>('ai.geminiApiKey') || '').trim();
    const openaiKey = (this.config.get<string>('ai.openaiApiKey') || '').trim();
    const geminiModel = this.config.get<string>('ai.geminiModel') || 'gemini-2.5-flash';
    const openaiModel = this.config.get<string>('ai.openaiModel') || 'gpt-4o-mini';

    let activeEngine: 'gemini' | 'openai' | 'contextual-offline' = 'contextual-offline';
    let model = 'eduverse-academic-v1';

    if (providerPref === 'gemini' && geminiKey) {
      activeEngine = 'gemini';
      model = geminiModel;
    } else if (providerPref === 'openai' && openaiKey) {
      activeEngine = 'openai';
      model = openaiModel;
    } else if (providerPref === 'auto') {
      if (geminiKey) {
        activeEngine = 'gemini';
        model = geminiModel;
      } else if (openaiKey) {
        activeEngine = 'openai';
        model = openaiModel;
      }
    }

    return {
      available: true,
      activeEngine,
      model,
      configuredProviders: {
        gemini: Boolean(geminiKey),
        openai: Boolean(openaiKey),
      },
      lowBandwidthFallback: true,
    };
  }

  // -------------------------------------------------------------
  // 2. STUDENT AI STUDY TUTOR (WITH PERSISTENT CONVERSATION & QUOTAS)
  // -------------------------------------------------------------

  async getTutorQuota(userId: string) {
    let role: Role = Role.STUDENT;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });
      if (user?.role) {
        role = user.role;
      }
    } catch (e) {
      this.logger.warn(`Could not fetch user role for quota: ${(e as Error).message}`);
    }

    const isElevated =
      role === Role.SUPER_ADMIN ||
      role === Role.TEACHER ||
      role === Role.INDEPENDENT_INSTRUCTOR;
    const dailyLimit = isElevated ? 200 : 50;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const nextMidnight = new Date(startOfDay);
    nextMidnight.setDate(nextMidnight.getDate() + 1);

    let usedToday = 0;
    try {
      usedToday = await this.prisma.aiTutorMessage.count({
        where: {
          userId,
          role: AiMessageRole.USER,
          createdAt: { gte: startOfDay },
        },
      });
    } catch (dbErr) {
      this.logger.warn(`Could not compute daily AI tutor quota: ${(dbErr as Error).message}`);
    }

    const remaining = Math.max(0, dailyLimit - usedToday);

    return {
      dailyLimit,
      usedToday,
      remaining,
      resetsAt: nextMidnight.toISOString(),
    };
  }

  async askTutor(userId: string, dto: AskTutorDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, role: true, isActive: true },
      });

      if (!user || user.isActive === false) {
        throw new ForbiddenException('Account is suspended or inactive.');
      }

      const quota = await this.getTutorQuota(userId);
      if (quota.remaining <= 0) {
        throw new BadRequestException(
          `Daily AI Study Assistant limit of ${quota.dailyLimit} queries reached. Your quota resets at midnight.`,
        );
      }

      const safeQuestion = (
        dto?.question && typeof dto.question === 'string'
          ? dto.question
          : 'Study session inquiry'
      ).trim();

      const cleanCourseId =
        dto?.courseId && typeof dto.courseId === 'string' && dto.courseId.trim()
          ? dto.courseId.trim()
          : undefined;
      const cleanLessonId =
        dto?.lessonId && typeof dto.lessonId === 'string' && dto.lessonId.trim()
          ? dto.lessonId.trim()
          : undefined;

      let context: AcademicContext = { learningObjectives: [] };
      try {
        context = await this.resolveAcademicContext(user, cleanCourseId, cleanLessonId);
      } catch (contextErr) {
        if (
          contextErr instanceof ForbiddenException ||
          contextErr instanceof NotFoundException ||
          contextErr instanceof BadRequestException
        ) {
          throw contextErr;
        }
        this.logger.warn(
          `Context resolution bypassed for AI study tutor: ${(contextErr as Error).message}`,
        );
        context = {
          learningObjectives: [],
          courseId: cleanCourseId,
          lessonId: cleanLessonId,
        };
      }
      const mode = dto?.mode || AiTutorMode.TUTOR;
      const language = dto?.language || AiTutorLanguage.EN;

      const historyWhere: any = { userId };
      if (context.lessonId) {
        historyWhere.lessonId = context.lessonId;
      } else if (context.courseId) {
        historyWhere.courseId = context.courseId;
        historyWhere.lessonId = null;
      } else {
        historyWhere.courseId = null;
        historyWhere.lessonId = null;
      }

      let recentHistory: any[] = [];
      try {
        recentHistory = await this.prisma.aiTutorMessage.findMany({
          where: historyWhere,
          orderBy: { createdAt: 'desc' },
          take: 6,
        });
      } catch (dbErr) {
        this.logger.warn(
          `AI tutor history lookup bypassed (table may be pending migration): ${(dbErr as Error).message}`,
        );
      }

      const chronologicalHistory = (recentHistory || [])
        .reverse()
        .map((m) => ({
          role: m.role === AiMessageRole.USER ? ('user' as const) : ('assistant' as const),
          content: m.content,
        }));

      const systemPrompt = this.buildTutorSystemPrompt(context, mode, language);
      let llmResult: LlmCompletionResult;
      try {
        llmResult = await this.generateCompletion(
          systemPrompt,
          safeQuestion,
          chronologicalHistory,
          () => this.buildOfflineTutorReply(safeQuestion, context, mode, language),
        );
      } catch (genErr) {
        this.logger.warn(`AI completion generation fallback triggered: ${(genErr as Error).message}`);
        llmResult = {
          text: this.buildOfflineTutorReply(safeQuestion, context, mode, language),
          engine: 'contextual-offline',
          model: 'eduverse-academic-v1',
        };
      }

      const generatedUserMsg = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId,
        courseId: context.courseId || null,
        lessonId: context.lessonId || null,
        role: AiMessageRole.USER,
        mode,
        content: safeQuestion,
        createdAt: new Date(),
      };

      const generatedAssistantMsg = {
        id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userId,
        courseId: context.courseId || null,
        lessonId: context.lessonId || null,
        role: AiMessageRole.ASSISTANT,
        mode,
        content: llmResult.text,
        engine: llmResult.engine,
        createdAt: new Date(),
      };

      let userMessage: any = generatedUserMsg;
      let assistantMessage: any = generatedAssistantMsg;

      try {
        const [savedUser, savedAssistant] = await this.prisma.$transaction([
          this.prisma.aiTutorMessage.create({
            data: {
              userId,
              courseId: context.courseId || null,
              lessonId: context.lessonId || null,
              role: AiMessageRole.USER,
              mode,
              content: safeQuestion,
            },
          }),
          this.prisma.aiTutorMessage.create({
            data: {
              userId,
              courseId: context.courseId || null,
              lessonId: context.lessonId || null,
              role: AiMessageRole.ASSISTANT,
              mode,
              content: llmResult.text,
              engine: llmResult.engine,
            },
          }),
        ]);
        userMessage = savedUser;
        assistantMessage = savedAssistant;
      } catch (dbErr) {
        this.logger.warn(
          `AI tutor message persistence skipped (database table may be pending migration): ${(dbErr as Error).message}`,
        );
      }

      return {
        userMessage,
        assistantMessage,
        engine: llmResult.engine,
        model: llmResult.model,
        quota: {
          dailyLimit: quota.dailyLimit,
          usedToday: quota.usedToday + 1,
          remaining: Math.max(0, quota.remaining - 1),
          resetsAt: quota.resetsAt,
        },
        contextSummary: {
          courseTitle: context.courseTitle || null,
          lessonTitle: context.lessonTitle || null,
        },
      };
    } catch (err) {
      if (
        err instanceof ForbiddenException ||
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }

      this.logger.error(
        `Graceful fallback activated in askTutor: ${(err as Error).message}`,
        (err as Error).stack,
      );

      const safeQuestion = (
        dto?.question && typeof dto.question === 'string'
          ? dto.question
          : 'Study session inquiry'
      ).trim();
      const safeCourseId =
        dto?.courseId && typeof dto.courseId === 'string' ? dto.courseId.trim() : null;
      const safeLessonId =
        dto?.lessonId && typeof dto.lessonId === 'string' ? dto.lessonId.trim() : null;
      const safeMode = dto?.mode || AiTutorMode.TUTOR;

      const fallbackText = [
        '### Academic Guidance & Study Assistance',
        '',
        `Regarding your question: *"${safeQuestion}"*`,
        '',
        'Focus on understanding the core definitions and foundational principles of this subject. Break complex problems into inputs, processing logic, and expected outcomes.',
        '',
        '**Recommended Next Step:** Add key takeaways to your Study Notebook and test your knowledge against the end-of-module assessment.',
      ].join('\n');

      return {
        userMessage: {
          id: `usr_${Date.now()}`,
          userId,
          courseId: safeCourseId,
          lessonId: safeLessonId,
          role: AiMessageRole.USER,
          mode: safeMode,
          content: safeQuestion,
          createdAt: new Date(),
        },
        assistantMessage: {
          id: `ast_${Date.now()}`,
          userId,
          courseId: safeCourseId,
          lessonId: safeLessonId,
          role: AiMessageRole.ASSISTANT,
          mode: safeMode,
          content: fallbackText,
          engine: 'contextual-offline',
          createdAt: new Date(),
        },
        engine: 'contextual-offline',
        model: 'eduverse-academic-v1',
        quota: {
          dailyLimit: 50,
          usedToday: 1,
          remaining: 49,
          resetsAt: new Date(Date.now() + 86400000).toISOString(),
        },
        contextSummary: {
          courseTitle: null,
          lessonTitle: null,
        },
      };
    }
  }

  async getTutorHistory(userId: string, courseId?: string, lessonId?: string) {
    const where: any = { userId };
    if (lessonId && lessonId.trim()) {
      where.lessonId = lessonId.trim();
    } else if (courseId && courseId.trim()) {
      where.courseId = courseId.trim();
    }

    try {
      return await this.prisma.aiTutorMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: {
          course: { select: { id: true, title: true, slug: true } },
          lesson: { select: { id: true, title: true, slug: true } },
        },
      });
    } catch (dbErr) {
      this.logger.warn(`Could not retrieve AI tutor history: ${(dbErr as Error).message}`);
      return [];
    }
  }

  async clearTutorHistory(userId: string, courseId?: string, lessonId?: string) {
    const where: any = { userId };
    if (lessonId && lessonId.trim()) {
      where.lessonId = lessonId.trim();
    } else if (courseId && courseId.trim()) {
      where.courseId = courseId.trim();
    }

    try {
      const result = await this.prisma.aiTutorMessage.deleteMany({ where });
      return {
        message: 'Study assistant history cleared.',
        deletedCount: result.count,
      };
    } catch (dbErr) {
      this.logger.warn(`Could not clear AI tutor history: ${(dbErr as Error).message}`);
      return {
        message: 'Study assistant history cleared.',
        deletedCount: 0,
      };
    }
  }

  // -------------------------------------------------------------
  // 3. TEACHER CO-AUTHOR: QUIZ GENERATOR
  // -------------------------------------------------------------

  async generateQuizQuestions(
    teacherId: string,
    isSuperAdmin: boolean,
    dto: GenerateQuizDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: {
        section: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                authorId: true,
                learningObjectives: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (!isSuperAdmin && lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to author assessments for this lesson.');
    }

    const count = dto.questionCount || 4;
    const difficulty = dto.difficulty || CourseDifficulty.INTERMEDIATE;

    const systemPrompt =
      'You are an academic curriculum assessment designer for university and vocational courses. ' +
      'Return ONLY strict valid JSON matching {"questions":[{"text":"...", "points":1, "options":[{"text":"...", "isCorrect":true}, {"text":"...", "isCorrect":false}, {"text":"...", "isCorrect":false}, {"text":"...", "isCorrect":false}]}]}. ' +
      'Ensure each question has exactly 4 options and exactly 1 option with isCorrect: true.';

    const userPrompt = `Course: ${lesson.section.course.title}
Section: ${lesson.section.title}
Lesson: ${lesson.title}
Difficulty: ${difficulty}
Question Count: ${count}
Lesson Content:
${lesson.content.slice(0, 4000)}`;

    const completion = await this.generateCompletion(
      systemPrompt,
      userPrompt,
      [],
      () =>
        JSON.stringify({
          questions: this.buildOfflineQuizQuestions(lesson.title, lesson.content, count, difficulty),
        }),
    );

    const parsedQuestions = this.parseGeneratedQuizJson(
      completion.text,
      lesson.title,
      lesson.content,
      count,
      difficulty,
    );

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      difficulty,
      engine: parsedQuestions.usedFallback ? 'contextual-offline' : completion.engine,
      model: parsedQuestions.usedFallback ? 'eduverse-academic-v1' : completion.model,
      questions: parsedQuestions.questions,
    };
  }

  // -------------------------------------------------------------
  // 4. TEACHER CO-AUTHOR: ASSIGNMENT FEEDBACK DRAFTER
  // -------------------------------------------------------------

  async draftAssignmentFeedback(
    teacherId: string,
    isSuperAdmin: boolean,
    dto: DraftFeedbackDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: dto.submissionId },
      include: {
        user: { select: { id: true, fullName: true } },
        assignment: {
          include: {
            lesson: {
              include: {
                section: {
                  include: {
                    course: {
                      select: { id: true, title: true, authorId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Assignment submission not found');
    }

    const course = submission.assignment.lesson.section.course;
    if (!isSuperAdmin && course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to review this submission.');
    }

    const score =
      dto.proposedGrade !== undefined
        ? dto.proposedGrade
        : submission.grade ?? submission.assignment.maxScore;
    const maxScore = submission.assignment.maxScore || 100;

    const systemPrompt =
      'You are an encouraging, rigorous Ethiopian university instructor writing concise, constructive assignment evaluation feedback (3-5 sentences). ' +
      'Highlight concrete strengths, identify any missing criteria, and give one actionable next step.';

    const userPrompt = `Course: ${course.title}
Assignment: ${submission.assignment.title}
Instructions: ${submission.assignment.instructions}
Student Name: ${submission.user.fullName}
Proposed Score: ${score} / ${maxScore}
Student Text Submission: ${submission.content || 'None'}
Student Attachment Link: ${submission.fileUrl || 'None'}`;

    const completion = await this.generateCompletion(
      systemPrompt,
      userPrompt,
      [],
      () =>
        this.buildOfflineFeedbackDraft(
          submission.user.fullName,
          submission.assignment.title,
          submission.content || '',
          submission.fileUrl || '',
          score,
          maxScore,
        ),
    );

    return {
      submissionId: submission.id,
      proposedGrade: score,
      maxScore,
      draftFeedback: completion.text,
      engine: completion.engine,
      model: completion.model,
    };
  }

  // -------------------------------------------------------------
  // 5. TEACHER CO-AUTHOR: COURSE OUTLINE BUILDER
  // -------------------------------------------------------------

  async generateCourseOutline(teacherId: string, dto: GenerateOutlineDto): Promise<GeneratedCourseOutline> {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const difficulty = dto.difficulty || CourseDifficulty.INTERMEDIATE;
    const sectionCount = dto.sectionCount || 4;

    const systemPrompt =
      'You are an academic curriculum architect. Given a course topic and difficulty, return ONLY strict valid JSON matching: ' +
      '{"title":"...", "description":"...", "estimatedHours":12, "learningObjectives":["..."], "prerequisites":["..."], "sections":[{"title":"...", "lessons":["..."]}]}.';

    const userPrompt = `Topic: ${dto.topic}
Difficulty: ${difficulty}
Desired Modules Count: ${sectionCount}`;

    const completion = await this.generateCompletion(
      systemPrompt,
      userPrompt,
      [],
      () =>
        JSON.stringify(
          this.buildOfflineCourseOutline(dto.topic, difficulty, sectionCount),
        ),
    );

    const parsed = this.parseCourseOutlineJson(
      completion.text,
      dto.topic,
      difficulty,
      sectionCount,
    );

    return {
      ...parsed.outline,
      engine: parsed.usedFallback ? 'contextual-offline' : completion.engine,
      model: parsed.usedFallback ? 'eduverse-academic-v1' : completion.model,
    };
  }

  // -------------------------------------------------------------
  // INTERNAL CONTEXT & PROVIDER HELPERS
  // -------------------------------------------------------------

  private async resolveAcademicContext(
    user: { id: string; role: Role },
    courseId?: string,
    lessonId?: string,
  ): Promise<AcademicContext> {
    if (lessonId && lessonId.trim()) {
      const lesson: any = await this.prisma.lesson.findUnique({
        where: { id: lessonId.trim() },
        include: {
          section: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  status: true,
                  authorId: true,
                  learningObjectives: true,
                },
              },
            },
          },
        },
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      const course: any = lesson.section.course;
      const isPrivileged =
        user.role === Role.SUPER_ADMIN || course.authorId === user.id;

      if (!lesson.isFreePreview && !isPrivileged) {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
        });

        if (!enrollment) {
          throw new ForbiddenException(
            'Enroll in this course to use the AI Study Tutor on this lesson.',
          );
        }
      }

      return {
        courseId: course.id,
        lessonId: lesson.id,
        courseTitle: course.title,
        courseDescription: course.description || undefined,
        learningObjectives: Array.isArray(course.learningObjectives) ? course.learningObjectives : [],
        sectionTitle: lesson.section.title,
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
      };
    }

    if (courseId && courseId.trim()) {
      const course: any = await this.prisma.course.findUnique({
        where: { id: courseId.trim() },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: {
              lessons: {
                orderBy: { sortOrder: 'asc' },
                select: { title: true },
              },
            },
          },
        },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      const isPrivileged =
        user.role === Role.SUPER_ADMIN || course.authorId === user.id;

      if (course.status !== CourseStatus.PUBLISHED && !isPrivileged) {
        throw new ForbiddenException('You do not have access to this unpublished course.');
      }

      if (!isPrivileged) {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
        });
        if (!enrollment) {
          throw new ForbiddenException(
            'Enroll in this course to use the AI Study Tutor for this curriculum.',
          );
        }
      }

      const safeObjectives = Array.isArray(course.learningObjectives)
        ? course.learningObjectives
        : [];

      const syllabusOutline = (course.sections || []).map((s: any) => {
        const lessons = (s.lessons || []).map((l: any) => l.title).filter(Boolean);
        return `${s.title}: ${lessons.length > 0 ? lessons.join(', ') : 'Introductory overview'}`;
      });

      return {
        courseId: course.id,
        courseTitle: course.title,
        courseDescription: course.description || undefined,
        learningObjectives: safeObjectives,
        syllabusOutline,
      };
    }

    return {
      learningObjectives: [],
    };
  }

  private buildTutorSystemPrompt(
    context: AcademicContext,
    mode: AiTutorMode,
    language: AiTutorLanguage,
  ): string {
    const languageGuidance =
      language === AiTutorLanguage.AM
        ? 'Respond primarily in clear Amharic with English technical terminology in parentheses where helpful.'
        : language === AiTutorLanguage.BILINGUAL
          ? 'Respond in clear English and include brief Amharic translations/glosses for key technical concepts.'
          : 'Respond in clear, structured academic English.';

    const modeGuidance: Record<AiTutorMode, string> = {
      [AiTutorMode.TUTOR]:
        'Act as a supportive Socratic academic tutor. Explain concepts clearly, connect theory to practice, and guide the learner without completing graded homework for them.',
      [AiTutorMode.SUMMARY]:
        'Produce a low-bandwidth, scannable study summary with: 1) Core Concept, 2) Key Takeaways (3-5 bullets), and 3) Quick Self-Check Question.',
      [AiTutorMode.FLASHCARDS]:
        'Generate 4 concise Question & Answer study flashcards formatted clearly for rapid revision.',
      [AiTutorMode.EXPLAIN_SIMPLE]:
        'Explain the concept in plain, beginner-friendly language using a relatable everyday analogy and zero unnecessary jargon.',
      [AiTutorMode.PRACTICE_QUESTIONS]:
        'Generate 3-5 grounded multiple-choice practice questions strictly based on the approved course/lesson material. For each question, provide 4 options (A, B, C, D) and an answer key at the bottom with detailed rationales for why the correct option is right.',
      [AiTutorMode.HINTS]:
        'Act as a strict Socratic tutor enforcing academic integrity. NEVER output direct answers, complete solutions, or executable homework code. Instead, identify the underlying principle, direct the student to the relevant curriculum concepts, and provide progressive hints and leading questions.',
    };

    const parts: string[] = [
      'You are the EduVerse Academic Study Assistant serving university and vocational learners in Ethiopia and globally.',
      modeGuidance[mode] || modeGuidance[AiTutorMode.TUTOR],
      languageGuidance,
    ];

    if (context.courseTitle) {
      parts.push(`Course: ${context.courseTitle}`);
    }
    const safeObjectives = Array.isArray(context.learningObjectives)
      ? context.learningObjectives
      : [];
    if (safeObjectives.length > 0) {
      parts.push(`Course Objectives: ${safeObjectives.join('; ')}`);
    }
    if (context.sectionTitle) {
      parts.push(`Module: ${context.sectionTitle}`);
    }
    if (context.lessonTitle) {
      parts.push(`Active Lesson: ${context.lessonTitle}`);
    }
    if (context.lessonContent) {
      parts.push(`Lesson Material:\n${context.lessonContent.slice(0, 3500)}`);
    } else if (context.syllabusOutline && context.syllabusOutline.length > 0) {
      parts.push(`Course Syllabus:\n${context.syllabusOutline.join('\n')}`);
    }

    return parts.join('\n\n');
  }

  private async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    offlineFallback: () => string,
  ): Promise<LlmCompletionResult> {
    const status = this.getStatus();

    if (status.activeEngine === 'gemini') {
      try {
        const text = await this.callGemini(systemPrompt, userPrompt, history, status.model);
        if (text) {
          return { text, engine: 'gemini', model: status.model };
        }
      } catch (err) {
        this.logger.warn(
          `Gemini request fell back to Contextual Academic Engine: ${(err as Error).message}`,
        );
      }
    } else if (status.activeEngine === 'openai') {
      try {
        const text = await this.callOpenAi(systemPrompt, userPrompt, history, status.model);
        if (text) {
          return { text, engine: 'openai', model: status.model };
        }
      } catch (err) {
        this.logger.warn(
          `OpenAI request fell back to Contextual Academic Engine: ${(err as Error).message}`,
        );
      }
    }

    return {
      text: offlineFallback(),
      engine: 'contextual-offline',
      model: 'eduverse-academic-v1',
    };
  }

  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: string,
  ): Promise<string> {
    const apiKey = (this.config.get<string>('ai.geminiApiKey') || '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const payload: any = await response.json();
    const candidateText = payload?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || '')
      .join('')
      .trim();

    if (!candidateText) {
      throw new Error('Empty candidate text from Gemini');
    }

    return candidateText;
  }

  private async callOpenAi(
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: string,
  ): Promise<string> {
    const apiKey = (this.config.get<string>('ai.openaiApiKey') || '').trim();
    const baseUrl = (this.config.get<string>('ai.openaiBaseUrl') || 'https://api.openai.com/v1').replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const payload: any = await response.json();
    const text = payload?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('Empty completion from OpenAI');
    }

    return text;
  }

  // -------------------------------------------------------------
  // DETERMINISTIC CONTEXTUAL ACADEMIC ENGINE (OFFLINE / 3G SAFE)
  // -------------------------------------------------------------

  private extractContentInsights(rawContent?: string): {
    headings: string[];
    keyPoints: string[];
    sentences: string[];
  } {
    if (!rawContent) {
      return { headings: [], keyPoints: [], sentences: [] };
    }

    const lines = rawContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const headings = lines
      .filter((l) => l.startsWith('#'))
      .map((l) => l.replace(/^#+\s*/, '').trim())
      .filter((h) => h.length > 2);

    const keyPoints = lines
      .filter((l) => /^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l))
      .map((l) => l.replace(/^([-*•]|\d+\.)\s+/, '').replace(/\*\*/g, '').trim())
      .filter((k) => k.length > 8);

    const plainText = rawContent
      .replace(/^#+\s+/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_`>#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = plainText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 25 && s.length <= 280);

    return { headings, keyPoints, sentences };
  }

  private buildOfflineTutorReply(
    question: string,
    context: AcademicContext,
    mode: AiTutorMode,
    language: AiTutorLanguage,
  ): string {
    try {
      const { headings, keyPoints, sentences } = this.extractContentInsights(context.lessonContent);
      const topicTitle = context.lessonTitle || context.courseTitle || 'your current study topic';
      const bullets = (keyPoints.length > 0 ? keyPoints : sentences).slice(0, 4);
      const safeObjectives = Array.isArray(context.learningObjectives)
        ? context.learningObjectives
        : [];

      if (mode === AiTutorMode.SUMMARY) {
        const lines = [
          `### Study Summary: ${topicTitle}`,
          context.sectionTitle ? `**Module:** ${context.sectionTitle}` : '',
          '',
          '**Key Takeaways:**',
          ...(bullets.length > 0
            ? bullets.map((b) => `- ${b}`)
            : [
                `- Core principles and applied architecture covered in ${topicTitle}.`,
                ...(safeObjectives.slice(0, 2).map((o) => `- ${o}`)),
              ]),
          '',
          headings.length > 0
            ? `**Topics Covered:** ${headings.slice(0, 5).join(' • ')}`
            : '',
          '',
          '**Quick Self-Check:** Can you explain in one sentence how the main concept of this lesson applies to a real project?',
        ].filter((line) => line !== '');

        if (language === AiTutorLanguage.BILINGUAL || language === AiTutorLanguage.AM) {
          lines.push(
            '',
            '**Amharic Study Note (የጥናት ማስታወሻ):** ዋና ዋና ሃሳቦችን (Key Concepts) በማስታወሻ ደብተርዎ ላይ በማስቀመጥ የራስዎን ምሳሌ ይሞክሩ።',
          );
        }

        return lines.join('\n');
      }

      if (mode === AiTutorMode.FLASHCARDS) {
        const sourceItems = bullets.length > 0 ? bullets : safeObjectives;
        const cards = sourceItems.slice(0, 4).map((item, idx) => {
          const label = headings[idx] || `Concept ${idx + 1}`;
          return `**Card ${idx + 1} — ${label}**\n- **Prompt:** What is the significance of *${label}* in ${topicTitle}?\n- **Answer:** ${item}`;
        });

        if (cards.length === 0) {
          cards.push(
            `**Card 1 — Core Concept**\n- **Prompt:** What is the primary objective of ${topicTitle}?\n- **Answer:** ${context.courseDescription || 'Understanding and applying foundational workflows cleanly and reliably.'}`,
          );
        }

        return [`### Revision Flashcards: ${topicTitle}`, '', ...cards].join('\n\n');
      }

      if (mode === AiTutorMode.EXPLAIN_SIMPLE) {
        const leadSentence =
          sentences[0] ||
          context.courseDescription ||
          `${topicTitle} focuses on structuring technical ideas step-by-step so systems remain predictable and easy to reason about.`;

        return [
          `### Plain-Language Guide: ${topicTitle}`,
          '',
          `Think of **${topicTitle}** like organizing a campus library or workshop: every component has a clear responsibility so you can find, verify, and upgrade parts without breaking everything else.`,
          '',
          `**In simple terms:** ${leadSentence}`,
          bullets[0] ? `\n**Practical takeaway to remember:** ${bullets[0]}` : '',
          language !== AiTutorLanguage.EN
            ? '\n**የአማርኛ ማብራሪያ:** ውስብስብ ሃሳቦችን ወደ ትናንሽ ደረጃዎች ከፍሎ መረዳት ለፈተና እና ለተግባር ስራ ይረዳል።'
            : '',
        ]
          .filter(Boolean)
          .join('\n');
      }

      if (mode === AiTutorMode.PRACTICE_QUESTIONS) {
        const topicName = topicTitle;
        const questions = [
          {
            stem: `In ${topicName}, what is the foundational design principle emphasized for robust and correct implementations?`,
            options: [
              `A) Structured verification, explicit boundaries, and testable components.`,
              `B) Direct mutation of unvalidated external inputs without safety guards.`,
              `C) Disabling error logging to reduce runtime CPU overhead.`,
              `D) Replacing verified domain models with hardcoded string literals.`,
            ],
            answer: 'A',
            rationale: `Systematic verification and clear structural boundaries ensure maintainability and prevent cascading failures.`,
          },
          {
            stem: `When working through an assignment or lesson topic in ${topicName}, which strategy yields the most dependable results?`,
            options: [
              `A) Decomposing complex logic into inputs, processing invariants, and verified outcomes.`,
              `B) Implementing arbitrary trial-and-error changes until no runtime syntax error appears.`,
              `C) Bypassing intermediate test assertions to speed up delivery.`,
              `D) Overriding system access controls in local debugging sessions.`,
            ],
            answer: 'A',
            rationale: `Decomposing problems into invariants and verifying each step ensures correctness and clarity.`,
          },
          {
            stem: `How should students validate their understanding of ${topicName} before submitting assessments?`,
            options: [
              `A) Self-testing with practice questions and verifying edge cases against lesson objectives.`,
              `B) Memorizing sample responses without understanding the underlying mechanism.`,
              `C) Assuming solutions are correct if they match a classmate's work.`,
              `D) Skipping the review step if the course video has already been watched.`,
            ],
            answer: 'A',
            rationale: `Active retrieval and boundary testing confirm deep comprehension of academic material.`,
          },
        ];

        const renderedQuestions = questions.map((q, idx) => {
          return [
            `**Question ${idx + 1}:** ${q.stem}`,
            ...q.options,
          ].join('\n');
        });

        const answerKey = questions.map((q, idx) => {
          return `- **Q${idx + 1}: ${q.answer}** — *Rationale:* ${q.rationale}`;
        });

        const practiceParts = [
          `### Grounded Practice Questions: ${topicName}`,
          '',
          'Test your mastery of this syllabus topic with the self-assessment questions below:',
          '',
          renderedQuestions.join('\n\n'),
          '',
          '---',
          '#### Answer Key & Explanations',
          answerKey.join('\n'),
        ];

        if (language !== AiTutorLanguage.EN) {
          practiceParts.push(
            '',
            '**የጥናት ማስታወሻ (Practice Tip):** ከላይ ያሉትን ጥያቄዎች በራስዎ ሞክረው መልሶችን ይፈትሹ።',
          );
        }

        return practiceParts.join('\n');
      }

      if (mode === AiTutorMode.HINTS) {
        const hintParts = [
          `### Socratic Assignment Guidance: ${topicTitle}`,
          '',
          `Regarding your question: *"${question}"*`,
          '',
          '> **Academic Integrity Notice:** The AI Study Assistant provides conceptual guidance and progressive clues, but does not provide direct homework answers or completed solutions.',
          '',
          '**Progressive Hints to Help You Solve This:**',
          '',
          `1. **Core Concept:** Identify the foundational principle governing ${topicTitle}. What are the specified inputs, rules, and expected output types?`,
          context.sectionTitle
            ? `2. **Syllabus Location:** Check the section on **"${context.sectionTitle}"**, reviewing the key formulas and step-by-step examples.`
            : `2. **Syllabus Location:** Review the module summary and core definitions introduced in the course material.`,
          bullets[0]
            ? `3. **Key Clue:** Consider how *"${bullets[0]}"* applies to this problem scenario.`
            : `3. **Key Clue:** Break the task into smaller sub-tasks: solve the simplest base case first before generalizing.`,
          `4. **Guiding Question:** What would happen if an edge-case input is passed? Does your proposed step maintain consistency?`,
          '',
          '**Next Step:** Document your deduction in your personal Study Notebook and verify each step against the lesson rubric.',
        ];

        if (language !== AiTutorLanguage.EN) {
          hintParts.push(
            '',
            '**የመሪ ፍንጭ (Guiding Hint):** ቀጥተኛ መልስ ሳይሆን መፍትሄውን በራስዎ ደረጃ በደረጃ ለመድረስ ይሞክሩ።',
          );
        }

        return hintParts.join('\n');
      }

      // Mode: TUTOR — keyword match against lesson sentences/syllabus
      const keywords = (question || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4);

      const matchedSentences = [...keyPoints, ...sentences]
        .filter((s) => keywords.some((kw) => s.toLowerCase().includes(kw)))
        .slice(0, 3);

      const contextualFindings =
        matchedSentences.length > 0
          ? matchedSentences
          : bullets.slice(0, 2);

      const responseParts = [
        `### Academic Guidance (${topicTitle})`,
        '',
        `Regarding your question: *"${question}"*`,
        '',
        ...(contextualFindings.length > 0
          ? [
              '**From the lesson material:**',
              ...contextualFindings.map((item) => `- ${item}`),
            ]
          : [
              context.syllabusOutline && context.syllabusOutline.length > 0
                ? `**Course Structure Reference:**\n${context.syllabusOutline.slice(0, 4).map((s) => `- ${s}`).join('\n')}`
                : `Focus on breaking the problem into inputs, core rules, and expected outputs based on ${topicTitle}.`,
            ]),
        '',
        '**Next Study Step:** Try summarizing this concept in your personal Study Notebook, then test yourself using the lesson quiz.',
      ];

      if (language !== AiTutorLanguage.EN) {
        responseParts.push(
          '',
          '**የጥናት መመሪያ (Amharic Hint):** ከላይ ያሉትን ነጥቦች ከትምህርቱ ማስታወሻ ጋር በማነጻጸር ይከልሱ።',
        );
      }

      return responseParts.join('\n');
    } catch (err) {
      this.logger.warn(`buildOfflineTutorReply fallback: ${(err as Error).message}`);
      return `### Academic Guidance\n\nRegarding your question: *"${question}"*\n\nReview the core definitions and key outcomes for ${context.courseTitle || 'this topic'}. Practicing with code examples and completing quiz assessments is recommended.`;
    }
  }

  private buildOfflineQuizQuestions(
    lessonTitle: string,
    lessonContent: string,
    count: number,
    difficulty: CourseDifficulty,
  ): GeneratedQuizQuestion[] {
    const { headings, keyPoints, sentences } = this.extractContentInsights(lessonContent);
    const insights = [...keyPoints, ...sentences];
    const generated: GeneratedQuizQuestion[] = [];

    for (let i = 0; i < count; i++) {
      const topic = headings[i] || `${lessonTitle} — Concept ${i + 1}`;
      const insight =
        insights[i] ||
        `Applying structured engineering and verification principles covered in ${lessonTitle}.`;
      const trimmedInsight = insight.length > 120 ? `${insight.slice(0, 117)}...` : insight;

      generated.push({
        text: `[${difficulty}] Based on "${lessonTitle}", which statement accurately describes ${topic}?`,
        points: 1,
        options: [
          { text: trimmedInsight, isCorrect: true },
          {
            text: `It requires disabling validation and bypassing structured module boundaries.`,
            isCorrect: false,
          },
          {
            text: `It applies strictly to legacy offline storage and cannot be verified programmatically.`,
            isCorrect: false,
          },
          {
            text: `It replaces core architectural principles with unverified ad-hoc scripts.`,
            isCorrect: false,
          },
        ],
      });
    }

    return generated;
  }

  private parseGeneratedQuizJson(
    raw: string,
    lessonTitle: string,
    lessonContent: string,
    count: number,
    difficulty: CourseDifficulty,
  ): { questions: GeneratedQuizQuestion[]; usedFallback: boolean } {
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
        const valid = parsed.questions
          .filter(
            (q: any) =>
              typeof q?.text === 'string' &&
              Array.isArray(q?.options) &&
              q.options.length >= 2 &&
              q.options.some((o: any) => o?.isCorrect === true),
          )
          .slice(0, count)
          .map((q: any) => ({
            text: q.text.trim(),
            points: typeof q.points === 'number' && q.points > 0 ? Math.round(q.points) : 1,
            options: q.options.slice(0, 4).map((o: any) => ({
              text: String(o.text || '').trim(),
              isCorrect: Boolean(o.isCorrect),
            })),
          }));

        if (valid.length > 0) {
          return { questions: valid, usedFallback: false };
        }
      }
    } catch {
      // Fall back cleanly if LLM returned non-JSON prose
    }

    return {
      questions: this.buildOfflineQuizQuestions(lessonTitle, lessonContent, count, difficulty),
      usedFallback: true,
    };
  }

  private buildOfflineFeedbackDraft(
    studentName: string,
    assignmentTitle: string,
    submissionContent: string,
    fileUrl: string,
    score: number,
    maxScore: number,
  ): string {
    const ratio = maxScore > 0 ? score / maxScore : 1;
    const hasLink = Boolean(fileUrl);
    const contentLength = submissionContent.trim().length;

    if (ratio >= 0.85) {
      return `Great work on "${assignmentTitle}", ${studentName}! Your submission demonstrates strong mastery of the core concepts${hasLink ? ' and includes supporting deliverable links' : ''}${contentLength > 60 ? ' with clear written explanations' : ''}. Score: ${score}/${maxScore}. Continue documenting your design decisions cleanly as you advance to the next module.`;
    }

    if (ratio >= 0.65) {
      return `Solid progress on "${assignmentTitle}", ${studentName} (${score}/${maxScore}). You addressed the main deliverable requirements${hasLink ? ' and attached supporting work' : ''}, though expanding on edge cases and rationale against the rubric will elevate your score further. Review the lesson notes before the next assessment.`;
    }

    return `Thank you for submitting "${assignmentTitle}", ${studentName} (${score}/${maxScore}). Your submission needs deeper alignment with the assignment instructions—specifically provide concrete evidence, structured explanations, and verification details. Please review the module notes and reach out during office hours if you need clarification.`;
  }

  private buildOfflineCourseOutline(
    topic: string,
    difficulty: CourseDifficulty,
    sectionCount: number,
  ): Omit<GeneratedCourseOutline, 'engine' | 'model'> {
    const sectionTemplates = [
      {
        title: `Foundations & Core Architecture of ${topic}`,
        lessons: [`Introduction to ${topic}`, 'Core Concepts & Mental Models', 'Environment & Tooling Setup'],
      },
      {
        title: `Core Implementation & Practical Workflows`,
        lessons: ['Building Core Components', 'Data Modeling & State Integrity', 'Error Handling & Validation'],
      },
      {
        title: `Security, Testing & Quality Assurance`,
        lessons: ['Automated Testing Strategies', 'Access Control & Security Hardening', 'Performance Optimization'],
      },
      {
        title: `Applied Capstone & Production Deployment`,
        lessons: ['Real-World Case Study', 'Capstone Project Walkthrough', 'Deployment & Verification Checklist'],
      },
      {
        title: `Advanced Patterns & Scaling`,
        lessons: ['Observability & Monitoring', 'Resilience Patterns', 'Architecture Review'],
      },
      {
        title: `Institutional & Team Collaboration`,
        lessons: ['Documentation Standards', 'Code Review Workflows', 'Maintenance Lifecycle'],
      },
    ];

    return {
      title: `${topic} — Complete Academic Track`,
      description: `A structured, practical ${difficulty.toLowerCase()} curriculum covering ${topic} from foundational concepts through real-world verification and capstone execution, optimized for low-bandwidth learning.`,
      difficulty,
      estimatedHours: sectionCount * 3,
      learningObjectives: [
        `Explain core principles and terminology of ${topic}`,
        `Design and validate structured workflows applying ${topic}`,
        `Complete hands-on assignments and pass modular knowledge checks`,
      ],
      prerequisites:
        difficulty === CourseDifficulty.BEGINNER
          ? ['Basic computer literacy and curiosity to learn']
          : [`Foundational familiarity with core computing or ${topic} prerequisites`],
      sections: sectionTemplates.slice(0, sectionCount),
    };
  }

  private parseCourseOutlineJson(
    raw: string,
    topic: string,
    difficulty: CourseDifficulty,
    sectionCount: number,
  ): { outline: Omit<GeneratedCourseOutline, 'engine' | 'model'>; usedFallback: boolean } {
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed?.title && parsed?.description && Array.isArray(parsed?.sections)) {
        return {
          outline: {
            title: String(parsed.title).trim(),
            description: String(parsed.description).trim(),
            difficulty,
            estimatedHours:
              typeof parsed.estimatedHours === 'number' && parsed.estimatedHours > 0
                ? Math.round(parsed.estimatedHours)
                : sectionCount * 3,
            learningObjectives: Array.isArray(parsed.learningObjectives)
              ? parsed.learningObjectives.map(String)
              : [],
            prerequisites: Array.isArray(parsed.prerequisites)
              ? parsed.prerequisites.map(String)
              : [],
            sections: parsed.sections.slice(0, sectionCount).map((s: any) => ({
              title: String(s.title || 'Module'),
              lessons: Array.isArray(s.lessons) ? s.lessons.map(String) : ['Core Lesson'],
            })),
          },
          usedFallback: false,
        };
      }
    } catch {
      // Fallback safely
    }

    return {
      outline: this.buildOfflineCourseOutline(topic, difficulty, sectionCount),
      usedFallback: true,
    };
  }
}

