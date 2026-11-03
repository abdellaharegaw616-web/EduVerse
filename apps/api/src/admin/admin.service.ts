import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService, CourseStatus } from '../database/prisma.service';
import { ModerateCourseDto, ModerationAction } from './dto/moderate-course.dto';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AdminService {
  private settings = {
    platformName: 'EduVerse - Learn Beyond Boundaries',
    maintenanceMode: false,
    allowRegistration: true,
    maxUploadSizeMb: 50,
    supportEmail: 'support@eduverse.et',
    defaultTimezone: 'Africa/Addis_Ababa',
  };

  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      roleBreakdown,
      totalInstitutions,
      courseStatusBreakdown,
      totalEnrollments,
      totalSubmissions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      this.prisma.institution.count(),
      this.prisma.course.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.enrollment.count(),
      this.prisma.assignmentSubmission.count(),
    ]);

    const rolesMap: Record<string, number> = {};
    roleBreakdown.forEach((r) => {
      rolesMap[r.role] = r._count.id;
    });

    const coursesMap: Record<string, number> = {};
    courseStatusBreakdown.forEach((c) => {
      coursesMap[c.status] = c._count.id;
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        byRole: rolesMap,
      },
      institutions: {
        total: totalInstitutions,
      },
      courses: {
        total: Object.values(coursesMap).reduce((a, b) => a + b, 0),
        draft: coursesMap[CourseStatus.DRAFT] || 0,
        pendingReview: coursesMap[CourseStatus.PENDING_REVIEW] || 0,
        published: coursesMap[CourseStatus.PUBLISHED] || 0,
        archived: coursesMap[CourseStatus.ARCHIVED] || 0,
      },
      enrollments: {
        total: totalEnrollments,
      },
      submissions: {
        total: totalSubmissions,
      },
      system: {
        status: 'HEALTHY',
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getAnalytics() {
    const [totalUsers, activeLearners, categories, completions] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.enrollment
          .groupBy({
            by: ['userId'],
          })
          .then((res) => res.length),
        this.prisma.courseCategory.findMany({
          include: {
            _count: {
              select: { courses: true },
            },
          },
        }),
        this.prisma.enrollment.count({
          where: { progressPercentage: 100 },
        }),
      ]);

    const totalEnrollments = await this.prisma.enrollment.count();
    const completionRate =
      totalEnrollments > 0
        ? Math.round((completions / totalEnrollments) * 100)
        : 0;

    return {
      totalUsers,
      activeLearners,
      completionRate,
      totalCompletions: completions,
      categories: categories.map((cat) => ({
        category: cat.name,
        count: cat._count.courses,
      })),
      recentTrends: [
        { month: 'Jun', registrations: Math.max(1, Math.floor(totalUsers * 0.1)) },
        { month: 'Jul', registrations: Math.max(2, Math.floor(totalUsers * 0.15)) },
        { month: 'Aug', registrations: Math.max(3, Math.floor(totalUsers * 0.2)) },
        { month: 'Sep', registrations: Math.max(4, Math.floor(totalUsers * 0.25)) },
        { month: 'Oct', registrations: Math.max(5, Math.floor(totalUsers * 0.3)) },
      ],
    };
  }

  async getAuditLogs(query: AuditQueryDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getCoursesForModeration(status?: CourseStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    } else {
      where.status = {
        in: [CourseStatus.PENDING_REVIEW, CourseStatus.DRAFT, CourseStatus.PUBLISHED],
      };
    }

    return this.prisma.course.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            sections: true,
            enrollments: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async moderateCourse(adminId: string, courseId: string, dto: ModerateCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { author: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const isApprove = dto.action === ModerationAction.APPROVE;
    const newStatus = isApprove ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: newStatus },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'COURSE_MODERATED',
        entityType: 'Course',
        entityId: courseId,
        metadata: {
          action: dto.action,
          previousStatus: course.status,
          newStatus,
          feedback: dto.feedback || null,
          courseTitle: course.title,
          authorId: course.authorId,
        },
      },
    });

    // Dispatch notification to course author
    await this.prisma.notification.create({
      data: {
        userId: course.authorId,
        title: isApprove ? 'Course Approved & Published' : 'Course Requires Revision',
        message: isApprove
          ? `Your course "${course.title}" has been reviewed and published to the EduVerse catalog.`
          : `Your course "${course.title}" was not approved. Feedback: ${
              dto.feedback || 'Please address quality standards and resubmit.'
            }`,
        actionUrl: `/teacher/courses/${course.id}`,
      },
    });

    return updated;
  }

  async getInstitutions() {
    return this.prisma.institution.findMany({
      include: {
        _count: {
          select: {
            members: true,
            departments: true,
            courses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInstitution(adminId: string, dto: CreateInstitutionDto) {
    const existing = await this.prisma.institution.findUnique({
      where: { slug: dto.slug.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(`An institution with slug "${dto.slug}" already exists`);
    }

    if (dto.domain) {
      const existingDomain = await this.prisma.institution.findUnique({
        where: { domain: dto.domain.toLowerCase().trim() },
      });
      if (existingDomain) {
        throw new ConflictException(`An institution with domain "${dto.domain}" already exists`);
      }
    }

    const institution = await this.prisma.institution.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.toLowerCase().trim(),
        domain: dto.domain ? dto.domain.toLowerCase().trim() : null,
        contactEmail: dto.contactEmail.toLowerCase().trim(),
        website: dto.website || null,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'INSTITUTION_CREATED',
        entityType: 'Institution',
        entityId: institution.id,
        metadata: {
          name: institution.name,
          slug: institution.slug,
          contactEmail: institution.contactEmail,
        },
      },
    });

    return institution;
  }

  async updateInstitution(
    adminId: string,
    institutionId: string,
    dto: UpdateInstitutionDto,
  ) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID ${institutionId} not found`);
    }

    const updated = await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.domain !== undefined && {
          domain: dto.domain ? dto.domain.toLowerCase().trim() : null,
        }),
        ...(dto.contactEmail && { contactEmail: dto.contactEmail.toLowerCase().trim() }),
        ...(dto.website !== undefined && { website: dto.website || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'INSTITUTION_UPDATED',
        entityType: 'Institution',
        entityId: institutionId,
        metadata: dto as any,
      },
    });

    return updated;
  }

  getSettings() {
    return this.settings;
  }

  async updateSettings(adminId: string, dto: UpdateSettingsDto) {
    this.settings = {
      ...this.settings,
      ...dto,
    };

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PLATFORM_SETTINGS_UPDATED',
        entityType: 'PlatformSettings',
        entityId: 'global',
        metadata: dto as any,
      },
    });

    return this.settings;
  }
}
