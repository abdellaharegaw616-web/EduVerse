import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

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

