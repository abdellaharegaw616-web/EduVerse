import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Get lesson details for student player.
   * Enforces server-side content authorization:
   * Requires student enrollment, author privileges, platform SUPER_ADMIN, or free preview.
   */
  async getLessonForStudent(userId: string, lessonId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended or inactive.');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: {
              include: {
                sections: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    lessons: {
                      orderBy: { sortOrder: 'asc' },
                      select: {
                        id: true,
                        title: true,
                        slug: true,
                        type: true,
                        durationMinutes: true,
                        sortOrder: true,
                        isFreePreview: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        resources: true,
        quiz: { select: { id: true, title: true, passingScore: true } },
        assignment: { select: { id: true, title: true, dueDate: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
    }

    const isAuthor = lesson.section.course.authorId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isFreePreview = lesson.isFreePreview;

    let enrollment = null;
    if (!isAuthor && !isSuperAdmin) {
      enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: lesson.section.courseId,
          },
        },
        include: {
          lessonProgress: {
            where: { lessonId },
          },
        },
      });

      if (!enrollment && !isFreePreview) {
        throw new ForbiddenException(
          'Access denied: You must be enrolled in this course to access this lesson.',
        );
      }
    }

    // Flatten all ordered lessons across sections to establish previous/next navigation
    const allOrderedLessons: Array<{
      id: string;
      title: string;
      slug: string;
      type: string;
      durationMinutes: number;
      sortOrder: number;
    }> = [];

    lesson.section.course.sections.forEach((sec) => {
      sec.lessons.forEach((l) => {
        allOrderedLessons.push(l);
      });
    });

    const currentIndex = allOrderedLessons.findIndex((l) => l.id === lesson.id);
    const previousLesson = currentIndex > 0 ? allOrderedLessons[currentIndex - 1] : null;
    const nextLesson =
      currentIndex >= 0 && currentIndex < allOrderedLessons.length - 1
        ? allOrderedLessons[currentIndex + 1]
        : null;

    const isCompleted = Boolean(
      enrollment?.lessonProgress &&
        enrollment.lessonProgress.length > 0 &&
        enrollment.lessonProgress[0]?.completed,
    );

    return {
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      durationMinutes: lesson.durationMinutes,
      sortOrder: lesson.sortOrder,
      type: lesson.type,
      isFreePreview: lesson.isFreePreview,
      courseId: lesson.section.course.id,
      courseTitle: lesson.section.course.title,
      courseSlug: lesson.section.course.slug,
      sectionId: lesson.section.id,
      sectionTitle: lesson.section.title,
      resources: lesson.resources,
      hasQuiz: !!lesson.quiz,
      quiz: lesson.quiz,
      hasAssignment: !!lesson.assignment,
      assignment: lesson.assignment,
      isCompleted,
      previousLesson,
      nextLesson,
    };
  }

  /**
   * 2. Mark lesson as completed for student.
   * Calculates progress directly from completed lessons.
   * Prevents students from submitting arbitrary completion percentages.
   * Updates PostgreSQL Enrollment progress & completedAt timestamp when 100% reached.
   */
  async completeLesson(userId: string, lessonId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.section.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Cannot complete lesson: You are not enrolled in this course.',
      );
    }

    // Persist lesson progress record in PostgreSQL
    await this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
    });

    // Compute progress strictly from database state
    const totalLessons = await this.prisma.lesson.count({
      where: {
        section: {
          courseId: lesson.section.courseId,
        },
      },
    });

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        enrollmentId: enrollment.id,
        completed: true,
      },
    });

    const progressPercentage =
      totalLessons > 0
        ? Math.min(100, Number(((completedLessons / totalLessons) * 100).toFixed(2)))
        : 100;

    const isCourseCompleted = progressPercentage >= 100;
    const completedAt = isCourseCompleted
      ? enrollment.completedAt || new Date()
      : null;

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercentage,
        completedAt,
      },
    });

    // Record course completion audit and dispatch student notification
    if (isCourseCompleted && !enrollment.completedAt) {
      await this.prisma.auditLog
        .create({
          data: {
            userId,
            action: 'COURSE_COMPLETED',
            entityType: 'Course',
            entityId: lesson.section.courseId,
            metadata: {
              courseTitle: lesson.section.course.title,
              totalLessons,
              completedLessons,
              completedAt,
            },
          },
        })
        .catch(() => null);

      await this.prisma.notification
        .create({
          data: {
            userId,
            title: 'Course Completed! 🎉',
            message: `Congratulations! You have successfully completed all lessons in "${lesson.section.course.title}".`,
            actionUrl: `/app/certificates`,
          },
        })
        .catch(() => null);
    }

    return {
      lessonId,
      completed: true,
      progressPercentage: updatedEnrollment.progressPercentage,
      completedLessons,
      totalLessons,
      courseCompleted: isCourseCompleted,
    };
  }

  /**
   * 3. Unmark lesson completion.
   * Recalculates progress and resets completion status if progress drops below 100%.
   */
  async uncompleteLesson(userId: string, lessonId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.section.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Cannot uncomplete lesson: You are not enrolled in this course.',
      );
    }

    // Delete progress record
    await this.prisma.lessonProgress
      .delete({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: enrollment.id,
            lessonId,
          },
        },
      })
      .catch(() => null);

    const totalLessons = await this.prisma.lesson.count({
      where: {
        section: {
          courseId: lesson.section.courseId,
        },
      },
    });

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        enrollmentId: enrollment.id,
        completed: true,
      },
    });

    const progressPercentage =
      totalLessons > 0
        ? Math.min(100, Number(((completedLessons / totalLessons) * 100).toFixed(2)))
        : 0;

    const completedAt = progressPercentage >= 100 ? enrollment.completedAt : null;

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercentage,
        completedAt,
      },
    });

    return {
      lessonId,
      completed: false,
      progressPercentage: updatedEnrollment.progressPercentage,
      completedLessons,
      totalLessons,
      courseCompleted: updatedEnrollment.completedAt !== null,
    };
  }

  /**
   * 4. Get Course Player Syllabus & State.
   * Returns course structure with per-lesson completion states and resume bookmark.
   */
  async getCoursePlayer(userId: string, courseIdentifier: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: courseIdentifier }, { slug: courseIdentifier }],
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: {
                resources: true,
                quiz: { select: { id: true, title: true } },
                assignment: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseIdentifier} not found.`);
    }

    const isAuthor = course.authorId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
      include: {
        lessonProgress: true,
      },
    });

    if (!isAuthor && !isSuperAdmin && !enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to access the course player.',
      );
    }

    const completedSet = new Set(
      (enrollment?.lessonProgress || [])
        .filter((lp: any) => lp.completed)
        .map((lp: any) => lp.lessonId),
    );

    let firstLesson: any = null;
    let lastLesson: any = null;
    let firstIncompleteLesson: any = null;
    let totalLessonsCount = 0;

    const sections = (course.sections || []).map((section: any) => ({
      id: section.id,
      title: section.title,
      sortOrder: section.sortOrder,
      lessons: (section.lessons || []).map((lesson: any) => {
        totalLessonsCount++;
        const isCompleted = completedSet.has(lesson.id);
        const item = {
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          durationMinutes: lesson.durationMinutes,
          type: lesson.type,
          sortOrder: lesson.sortOrder,
          isFreePreview: lesson.isFreePreview,
          isCompleted,
          hasQuiz: !!lesson.quiz,
          hasAssignment: !!lesson.assignment,
          resourcesCount: (lesson.resources || []).length,
        };

        if (!firstLesson) firstLesson = item;
        lastLesson = item;

        if (!isCompleted && !firstIncompleteLesson) {
          firstIncompleteLesson = item;
        }

        return item;
      }),
    }));

    const resumeLesson = firstIncompleteLesson || lastLesson || firstLesson;

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        author: {
          id: course.author.id,
          fullName: course.author.fullName,
          avatarUrl: course.author.profile?.avatarUrl || null,
        },
      },
      enrollment: enrollment
        ? {
            id: enrollment.id,
            progressPercentage: enrollment.progressPercentage,
            completedAt: enrollment.completedAt,
            enrolledAt: enrollment.enrolledAt,
            completedLessons: completedSet.size,
            totalLessons: totalLessonsCount,
          }
        : null,
      sections,
      resumeLesson,
      totalLessons: totalLessonsCount,
      completedLessons: completedSet.size,
      progressPercentage: enrollment ? enrollment.progressPercentage : 100,
    };
  }

  /**
   * 5. Resume learning endpoint.
   * Directly resolves the next lesson that the student should work on.
   */
  async getResumeLesson(userId: string, courseIdentifier: string) {
    const player = await this.getCoursePlayer(userId, courseIdentifier);
    return {
      courseId: player.course.id,
      courseSlug: player.course.slug,
      resumeLesson: player.resumeLesson,
      progressPercentage: player.progressPercentage,
    };
  }
}
