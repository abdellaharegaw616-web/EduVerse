import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService, Role, NotificationType } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getMyAnnouncements(userId: string) {
    const [enrollments, authoredCourses, memberships] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId },
        select: { courseId: true },
      }),
      this.prisma.course.findMany({
        where: { authorId: userId },
        select: { id: true },
      }),
      this.prisma.institutionMember.findMany({
        where: { userId },
        select: { institutionId: true },
      }),
    ]);

    const courseIds = Array.from(
      new Set([
        ...enrollments.map((e) => e.courseId),
        ...authoredCourses.map((c) => c.id),
      ]),
    );
    const institutionIds = memberships.map((m) => m.institutionId);

    const orClauses: any[] = [
      { courseId: null, institutionId: null },
    ];

    if (courseIds.length > 0) {
      orClauses.push({ courseId: { in: courseIds } });
    }
    if (institutionIds.length > 0) {
      orClauses.push({ courseId: null, institutionId: { in: institutionIds } });
    }

    return this.prisma.announcement.findMany({
      where: { OR: orClauses },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        course: { select: { id: true, title: true, slug: true } },
        institution: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async getCourseAnnouncements(userId: string, userRole: Role | string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, authorId: true, status: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const isPrivileged = userRole === Role.SUPER_ADMIN || course.authorId === userId;
    if (!isPrivileged) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
      });
      if (!enrollment) {
        throw new ForbiddenException('Enroll in this course to view course announcements.');
      }
    }

    return this.prisma.announcement.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async getTeacherAnnouncements(caller: AuthenticatedUser) {
    const whereClause =
      caller.role === Role.SUPER_ADMIN
        ? {}
        : {
            OR: [
              { authorId: caller.id },
              { course: { authorId: caller.id } },
            ],
          };

    return this.prisma.announcement.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        course: { select: { id: true, title: true, slug: true } },
        institution: { select: { id: true, name: true } },
      },
    });
  }

  async createAnnouncement(caller: AuthenticatedUser, dto: CreateAnnouncementDto) {
    const actor = await this.prisma.user.findUnique({
      where: { id: caller.id },
      select: { id: true, isActive: true },
    });

    if (!actor || actor.isActive === false) {
      throw new ForbiddenException('Account is suspended or inactive.');
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
        select: { id: true, title: true, slug: true, authorId: true, institutionId: true },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (caller.role !== Role.SUPER_ADMIN && course.authorId !== caller.id) {
        throw new ForbiddenException(
          'You can only publish announcements for courses you author.',
        );
      }

      const announcement = await this.prisma.announcement.create({
        data: {
          title: dto.title.trim(),
          content: dto.content.trim(),
          authorId: caller.id,
          courseId: course.id,
          institutionId: course.institutionId || null,
        },
        include: {
          author: { select: { id: true, fullName: true, role: true } },
          course: { select: { id: true, title: true, slug: true } },
        },
      });

      // Notify enrolled students without blocking response on transient email failures
      const enrollments = await this.prisma.enrollment.findMany({
        where: { courseId: course.id },
        select: { userId: true },
      });

      const targetUserIds = enrollments
        .map((e) => e.userId)
        .filter((uid) => uid !== caller.id);

      await Promise.allSettled(
        targetUserIds.map((studentId) =>
          this.notificationsService.dispatch({
            userId: studentId,
            type: NotificationType.COURSE_ANNOUNCEMENT,
            title: `${course.title}: ${announcement.title}`,
            message: announcement.content.slice(0, 240),
            actionUrl: `/courses/${course.slug}/learn`,
            metadata: {
              announcementId: announcement.id,
              courseId: course.id,
            },
            idempotencyKey: `ann-${announcement.id}-${studentId}`,
          }),
        ),
      );

      this.logger.log(
        `Announcement "${announcement.title}" published to course ${course.id} (${targetUserIds.length} learners notified).`,
      );

      return {
        announcement,
        notifiedStudentsCount: targetUserIds.length,
      };
    }

    if (dto.institutionId) {
      if (caller.role !== Role.SUPER_ADMIN && caller.role !== Role.INSTITUTION_ADMIN) {
        throw new ForbiddenException(
          'Only institution administrators or super admins can publish institutional announcements.',
        );
      }

      if (caller.role === Role.INSTITUTION_ADMIN) {
        const membership = await this.prisma.institutionMember.findUnique({
          where: {
            institutionId_userId: {
              institutionId: dto.institutionId,
              userId: caller.id,
            },
          },
        });
        if (!membership || membership.role !== Role.INSTITUTION_ADMIN) {
          throw new ForbiddenException('You are not an administrator of this institution.');
        }
      }

      const announcement = await this.prisma.announcement.create({
        data: {
          title: dto.title.trim(),
          content: dto.content.trim(),
          authorId: caller.id,
          institutionId: dto.institutionId,
        },
        include: {
          author: { select: { id: true, fullName: true, role: true } },
          institution: { select: { id: true, name: true } },
        },
      });

      return { announcement, notifiedStudentsCount: 0 };
    }

    if (caller.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(
        'Please select a course for your announcement (global notices require SUPER_ADMIN).',
      );
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        authorId: caller.id,
      },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
      },
    });

    return { announcement, notifiedStudentsCount: 0 };
  }

  async deleteAnnouncement(caller: AuthenticatedUser, id: string) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found');
    }

    if (caller.role !== Role.SUPER_ADMIN && existing.authorId !== caller.id) {
      throw new ForbiddenException('You can only delete announcements you published.');
    }

    await this.prisma.announcement.delete({ where: { id } });
    return { message: 'Announcement deleted successfully' };
  }
}

