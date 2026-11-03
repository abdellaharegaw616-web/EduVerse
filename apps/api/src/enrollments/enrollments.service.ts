import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService, CourseStatus } from '../database/prisma.service';

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

  // 5. Enroll in Course (Free Enrollment)
  async enrollInCourse(userId: string, courseId: string) {
    // 1. Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.isActive === false) {
      throw new ForbiddenException('Active account required to enroll');
    }

    // 2. Verify course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: { select: { name: true } },
        author: { select: { fullName: true } },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Business Rule: Course must be published and available
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot enroll in an unpublished course. Only published courses accept enrollments.',
      );
    }

    // 3. Prevent duplicate enrollment
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You are already enrolled in this course');
    }

    // 4. Atomic transaction: create enrollment, audit log, and notification
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          userId,
          courseId,
          progressPercentage: 0.0,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
              difficulty: true,
              language: true,
              estimatedHours: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'COURSE_ENROLLMENT_CREATED',
          entityType: 'Enrollment',
          entityId: enrollment.id,
          metadata: {
            courseId,
            courseTitle: course.title,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Enrollment Confirmed',
          message: `You have successfully enrolled in "${course.title}". Start your learning journey!`,
          actionUrl: `/app/courses/${course.id}`,
        },
      });

      return {
        message: 'Successfully enrolled in course',
        enrollment: {
          id: enrollment.id,
          courseId: enrollment.courseId,
          enrolledAt: enrollment.enrolledAt,
          progressPercentage: enrollment.progressPercentage,
          status: 'IN_PROGRESS',
          course: enrollment.course,
        },
      };
    });
  }

  // 6. Get Enrollment History & Status for Authenticated Student (GET /enrollments/me)
  async getEnrollmentsMe(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            category: { select: { name: true, slug: true } },
            author: { select: { id: true, fullName: true, profile: { select: { avatarUrl: true } } } },
            _count: {
              select: {
                sections: true,
                reviews: true,
              },
            },
            sections: {
              select: {
                _count: {
                  select: { lessons: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((e) => {
      const totalLessons = e.course.sections.reduce((acc, s) => acc + s._count.lessons, 0);
      const status = e.completedAt !== null || e.progressPercentage >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

      return {
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        progressPercentage: e.progressPercentage,
        status,
        course: {
          id: e.course.id,
          title: e.course.title,
          slug: e.course.slug,
          description: e.course.description,
          thumbnailUrl: e.course.thumbnailUrl,
          difficulty: e.course.difficulty,
          language: e.course.language,
          estimatedHours: e.course.estimatedHours,
          category: e.course.category?.name || 'General',
          author: {
            id: e.course.author.id,
            fullName: e.course.author.fullName,
            avatarUrl: e.course.author.profile?.avatarUrl || null,
          },
          sectionsCount: e.course._count.sections,
          lessonsCount: totalLessons,
        },
      };
    });
  }

  // 7. Verify Authorized Course Content Access
  async checkCourseAccess(userId: string, courseId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isActive === false) {
      throw new ForbiddenException('Active account required');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, authorId: true, status: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Super admins or the course author always have authorized access
    if (user.role === 'SUPER_ADMIN' || course.authorId === userId) {
      return {
        hasAccess: true,
        role: user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'AUTHOR',
      };
    }

    // For students, check active enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to access full curriculum content',
      );
    }

    return {
      hasAccess: true,
      role: 'STUDENT',
      enrollmentId: enrollment.id,
      progressPercentage: enrollment.progressPercentage,
    };
  }
}
