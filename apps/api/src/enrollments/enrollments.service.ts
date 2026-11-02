import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Aggregated Dashboard Overview for Authenticated Student
  async getMyDashboard(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            author: { select: { fullName: true } },
            institution: { select: { name: true, slug: true } },
            category: { select: { name: true } },
            sections: {
              include: {
                lessons: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const enrolledCount = enrollments.length;
    const completedCount = enrollments.filter((e) => e.completedAt !== null).length;
    const averageProgress =
      enrolledCount > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) /
              enrolledCount,
          )
        : 0;

    const recentLessons = await this.prisma.lessonProgress.findMany({
      where: { enrollment: { userId } },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    const upcomingAssignments = await this.prisma.assignment.findMany({
      where: {
        lesson: {
          section: {
            course: {
              enrollments: { some: { userId } },
            },
          },
        },
      },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
        submissions: {
          where: { userId },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    const recentQuizAttempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                section: {
                  include: {
                    course: { select: { title: true, slug: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { attemptedAt: 'desc' },
      take: 5,
    });

    const earnedCertificates = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: { select: { title: true, slug: true } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 5,
    });

    return {
      stats: {
        enrolledCount,
        completedCount,
        averageProgress,
        certificatesCount: earnedCertificates.length,
      },
      recentEnrollments: enrollments.slice(0, 4),
      recentLessons,
      upcomingAssignments,
      recentQuizAttempts,
      earnedCertificates,
    };
  }

  // 2. Paginated Enrolled Courses for Authenticated Student
  async getMyEnrollments(
    userId: string,
    query: { status?: 'all' | 'in-progress' | 'completed'; page?: number; limit?: number },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };
    if (query.status === 'completed') {
      whereClause.completedAt = { not: null };
    } else if (query.status === 'in-progress') {
      whereClause.completedAt = null;
    }

    const [total, items] = await Promise.all([
      this.prisma.enrollment.count({ where: whereClause }),
      this.prisma.enrollment.findMany({
        where: whereClause,
        include: {
          course: {
            include: {
              author: { select: { fullName: true } },
              institution: { select: { name: true, slug: true } },
              category: { select: { name: true } },
              sections: {
                include: {
                  lessons: { select: { id: true, durationMinutes: true } },
                },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 3. Detailed Learning Progress Breakdown
  async getMyProgress(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            author: { select: { fullName: true } },
            sections: {
              include: {
                lessons: {
                  include: {
                    progress: {
                      where: { enrollment: { userId } },
                    },
                  },
                },
              },
            },
          },
        },
        lessonProgress: true,
        quizAttempts: true,
        submissions: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((enrollment) => {
      let totalLessons = 0;
      let completedLessons = 0;

      enrollment.course.sections.forEach((section) => {
        section.lessons.forEach((lesson) => {
          totalLessons++;
          if (lesson.progress && lesson.progress.length > 0 && lesson.progress[0]?.completed) {
            completedLessons++;
          }
        });
      });

      return {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        courseSlug: enrollment.course.slug,
        authorName: enrollment.course.author.fullName,
        progressPercentage: enrollment.progressPercentage,
        totalLessons,
        completedLessons,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        quizzesTaken: enrollment.quizAttempts.length,
        assignmentsSubmitted: enrollment.submissions.length,
      };
    });
  }

  // 4. Recently Accessed Lessons
  async getMyRecentLessons(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.lessonProgress.count({
        where: { enrollment: { userId } },
      }),
      this.prisma.lessonProgress.findMany({
        where: { enrollment: { userId } },
        include: {
          lesson: {
            include: {
              section: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      institution: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
