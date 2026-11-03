import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Get quiz for student taking the assessment.
   * SECURITY: Strictly omits `isCorrect` from question answer options!
   */
  async getQuizForStudent(userId: string, quizId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended or inactive.');
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              select: {
                id: true,
                text: true,
                // CRITICAL SECURITY: Never expose isCorrect before submission!
              },
            },
          },
        },
        attempts: {
          where: { userId },
          orderBy: { attemptedAt: 'desc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found.`);
    }

    const isAuthor = quiz.lesson.section.course.authorId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    let enrollment = null;
    if (!isAuthor && !isSuperAdmin) {
      enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: quiz.lesson.section.courseId,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'Access denied: You must be enrolled in this course to take this quiz.',
        );
      }
    }

    const previousAttemptsCount = quiz.attempts.length;
    const remainingAttempts = Math.max(0, quiz.attemptLimit - previousAttemptsCount);
    const hasPassed = quiz.attempts.some((a) => a.passed);
    const bestScore =
      quiz.attempts.length > 0 ? Math.max(...quiz.attempts.map((a) => a.score)) : null;

    return {
      id: quiz.id,
      title: quiz.title,
      lessonId: quiz.lessonId,
      lessonTitle: quiz.lesson.title,
      courseId: quiz.lesson.section.course.id,
      courseTitle: quiz.lesson.section.course.title,
      courseSlug: quiz.lesson.section.course.slug,
      passingScore: quiz.passingScore,
      timeLimitMinutes: quiz.timeLimitMinutes,
      attemptLimit: quiz.attemptLimit,
      remainingAttempts,
      previousAttemptsCount,
      bestScore,
      hasPassed,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        sortOrder: q.sortOrder,
        options: q.options,
      })),
    };
  }

  /**
   * 2. Submit quiz for automatic server-side grading.
   * SECURITY:
   * - Validates attempt limits.
   * - Validates deadlines / time limits on backend.
   * - Grades automatically on backend (prevents client score tampering).
   * - Uses database transactions for atomic submission records.
   */
  async submitQuiz(userId: string, quizId: string, dto: SubmitQuizDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
        questions: {
          include: {
            options: true, // Internal grading includes isCorrect
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found.`);
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: quiz.lesson.section.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Cannot submit quiz: You are not enrolled in this course.');
    }

    // 1. Validate Attempt Limit
    const existingAttemptsCount = await this.prisma.quizAttempt.count({
      where: {
        quizId,
        userId,
      },
    });

    if (existingAttemptsCount >= quiz.attemptLimit) {
      throw new BadRequestException(
        `Maximum attempt limit of ${quiz.attemptLimit} exceeded for this quiz.`,
      );
    }

    // 2. Validate Time Limit / Deadline
    const now = new Date();
    if (dto.startedAt && quiz.timeLimitMinutes) {
      const started = new Date(dto.startedAt);
      if (isNaN(started.getTime())) {
        throw new BadRequestException('Invalid startedAt timestamp.');
      }
      const elapsedMinutes = (now.getTime() - started.getTime()) / (1000 * 60);
      // 1-minute network jitter grace period
      if (elapsedMinutes > quiz.timeLimitMinutes + 1) {
        throw new BadRequestException(
          `Quiz time limit expired (${quiz.timeLimitMinutes} minutes allowed).`,
        );
      }
    }

    // 3. Validate Submitted Question IDs
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
    for (const ans of dto.answers) {
      if (!questionMap.has(ans.questionId)) {
        throw new BadRequestException(
          `Answer submitted for invalid or non-existent question ID: ${ans.questionId}`,
        );
      }
    }

    // 4. Automatic Server-Side Grading
    let totalPointsPossible = 0;
    let earnedPoints = 0;
    const breakdown: Array<{
      questionId: string;
      isCorrect: boolean;
      pointsEarned: number;
      pointsPossible: number;
    }> = [];

    for (const question of quiz.questions) {
      totalPointsPossible += question.points;
      const studentAnswer = dto.answers.find((a) => a.questionId === question.id);
      let isCorrect = false;

      if (studentAnswer) {
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          const selected = question.options.find(
            (o) => o.id === studentAnswer.selectedOptionId,
          );
          if (selected && selected.isCorrect) {
            isCorrect = true;
          }
        } else if (question.type === 'SHORT_ANSWER') {
          const studentText = (studentAnswer.textAnswer || '').trim().toLowerCase();
          const matched = question.options.some(
            (opt) => opt.isCorrect && opt.text.trim().toLowerCase() === studentText,
          );
          if (matched && studentText.length > 0) {
            isCorrect = true;
          }
        }
      }

      const pointsEarned = isCorrect ? question.points : 0;
      earnedPoints += pointsEarned;

      breakdown.push({
        questionId: question.id,
        isCorrect,
        pointsEarned,
        pointsPossible: question.points,
      });
    }

    const score =
      totalPointsPossible > 0
        ? Math.round((earnedPoints / totalPointsPossible) * 100)
        : 100;
    const passed = score >= quiz.passingScore;

    // 5. Database Transaction for Submission Integrity
    const attempt = await this.prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.quizAttempt.create({
        data: {
          quizId,
          enrollmentId: enrollment.id,
          userId,
          score,
          passed,
          answers: dto.answers as any,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : now,
          attemptedAt: now,
        },
      });

      if (passed) {
        await tx.auditLog
          .create({
            data: {
              userId,
              action: 'QUIZ_PASSED',
              entityType: 'Quiz',
              entityId: quizId,
              metadata: {
                quizTitle: quiz.title,
                score,
                passingScore: quiz.passingScore,
                attemptNumber: existingAttemptsCount + 1,
              },
            },
          })
          .catch(() => null);

        await tx.notification
          .create({
            data: {
              userId,
              title: 'Quiz Passed! 🎯',
              message: `You passed "${quiz.title}" with a score of ${score}%!`,
              actionUrl: `/app/quizzes`,
            },
          })
          .catch(() => null);
      }

      return createdAttempt;
    });

    return {
      attemptId: attempt.id,
      quizId,
      score,
      passingScore: quiz.passingScore,
      passed,
      earnedPoints,
      totalPoints: totalPointsPossible,
      attemptNumber: existingAttemptsCount + 1,
      remainingAttempts: Math.max(0, quiz.attemptLimit - (existingAttemptsCount + 1)),
      attemptedAt: attempt.attemptedAt,
      breakdown,
    };
  }

  /**
   * 3. Get quiz attempt history for a specific quiz.
   */
  async getQuizAttempts(userId: string, quizId: string) {
    return this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId,
      },
      orderBy: { attemptedAt: 'desc' },
      select: {
        id: true,
        score: true,
        passed: true,
        attemptedAt: true,
        startedAt: true,
      },
    });
  }

  /**
   * 4. Get specific attempt details.
   */
  async getAttemptDetails(userId: string, attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found.`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this quiz attempt.');
    }

    return attempt;
  }

  /**
   * 5. Get all quiz attempts and results for authenticated student.
   */
  async getMyQuizzes(userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
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
          },
        },
      },
      orderBy: { attemptedAt: 'desc' },
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
      passingScore: attempt.quiz.passingScore,
      score: attempt.score,
      passed: attempt.passed,
      attemptedAt: attempt.attemptedAt,
      courseTitle: attempt.quiz.lesson.section.course.title,
      courseSlug: attempt.quiz.lesson.section.course.slug,
      lessonTitle: attempt.quiz.lesson.title,
    }));
  }
}
