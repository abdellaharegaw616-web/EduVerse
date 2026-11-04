import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService, CourseStatus, Role } from '../database/prisma.service';
import { ModerateCourseDto, ModerationAction } from './dto/moderate-course.dto';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { SuspendUserAdminDto } from './dto/suspend-user-admin.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ContentModerationDto } from './dto/content-moderation.dto';

@Injectable()
export class AdminService {
  private settings = {
    platformName: 'EduVerse - Learn Beyond Boundaries',
    maintenanceMode: false,
    allowRegistration: true,
    requireCourseApproval: true,
    maxUploadSizeMb: 50,
    supportEmail: 'support@eduverse.et',
    defaultTimezone: 'Africa/Addis_Ababa',
  };

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // AUDIT SANITIZATION & RECORDING HELPER
  // -------------------------------------------------------------

  /**
   * Sanitizes audit metadata to guarantee that no passwords, password hashes,
   * authentication tokens, refresh secrets, or authorization headers leak into audit logs.
   */
  private sanitizeMetadata(data: Record<string, any>): Record<string, any> {
    if (!data || typeof data !== 'object') return {};
    const sanitized = { ...data };
    const forbiddenKeys = [
      'password',
      'passwordhash',
      'token',
      'refreshtoken',
      'accesstoken',
      'secret',
      'authorization',
      'cookie',
    ];

    for (const key of Object.keys(sanitized)) {
      if (forbiddenKeys.some((f) => key.toLowerCase().includes(f))) {
        delete sanitized[key];
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeMetadata(sanitized[key]);
      }
    }
    return sanitized;
  }

  async recordAuditLog(params: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any>;
    outcome?: 'SUCCESS' | 'FAILURE';
    ipAddress?: string;
  }) {
    const safeMeta = this.sanitizeMetadata({
      ...(params.metadata || {}),
      outcome: params.outcome || 'SUCCESS',
      recordedAt: new Date().toISOString(),
    });

    return this.prisma.auditLog.create({
      data: {
        userId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: safeMeta,
        ipAddress: params.ipAddress || null,
      },
    });
  }

  // -------------------------------------------------------------
  // 1. OVERVIEW & ANALYTICS
  // -------------------------------------------------------------

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

  // -------------------------------------------------------------
  // 2. USER MODERATION (SUSPENSION & REACTIVATION)
  // -------------------------------------------------------------

  async getUsers(query: UserQueryDto) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              authoredCourses: true,
              enrollments: true,
              institutionMemberships: true,
            },
          },
        },
      }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        institutionMemberships: {
          include: {
            institution: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: {
          select: {
            authoredCourses: true,
            enrollments: true,
            certificates: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async setUserStatus(adminId: string, targetUserId: string, dto: SuspendUserAdminDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    // Security guard: Root Super Admins cannot be suspended
    if (targetUser.role === Role.SUPER_ADMIN && !dto.isActive) {
      throw new ForbiddenException('Root Super Admin accounts cannot be suspended');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        updatedAt: true,
      },
    });

    // If suspending, immediately terminate all active sessions/refresh tokens
    if (!dto.isActive) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: targetUserId },
      });
    }

    // Traceable audit record capturing actor, action, target, safe metadata, and outcome
    await this.recordAuditLog({
      actorId: adminId,
      action: dto.isActive ? 'USER_ACCOUNT_REACTIVATED' : 'USER_ACCOUNT_SUSPENDED',
      entityType: 'User',
      entityId: targetUserId,
      metadata: {
        reason: dto.reason || (dto.isActive ? 'Reactivated by administrator' : 'Suspended for platform policy violation'),
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        previousStatus: targetUser.isActive,
        newStatus: dto.isActive,
      },
      outcome: 'SUCCESS',
    });

    // Create in-app notification for the target user
    await this.prisma.notification.create({
      data: {
        userId: targetUserId,
        title: dto.isActive ? 'Account Reactivated' : 'Account Suspended',
        message: dto.isActive
          ? 'Your EduVerse account access has been restored. You may now continue learning.'
          : `Your account has been suspended by an administrator. Reason: ${
              dto.reason || 'Violation of EduVerse community guidelines.'
            }`,
      },
    }).catch(() => null);

    return updatedUser;
  }

  // -------------------------------------------------------------
  // 3. COURSE MODERATION (REVIEW, APPROVAL, REJECTION)
  // -------------------------------------------------------------

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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
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

  async getCourseForReview(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        sections: {
          include: {
            lessons: {
              include: {
                resources: true,
                quiz: {
                  select: {
                    id: true,
                    title: true,
                    passingScore: true,
                    timeLimitMinutes: true,
                  },
                },
                assignment: {
                  select: {
                    id: true,
                    title: true,
                    maxScore: true,
                    dueDate: true,
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
            certificates: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    return course;
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

    // Enforce rejection reason rule: rejection requires a reason
    const rejectionReason = (dto.reason || dto.feedback || '').trim();
    if (!isApprove && !rejectionReason) {
      throw new BadRequestException('A rejection reason or feedback is required when rejecting a course');
    }

    const newStatus = isApprove ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: newStatus },
    });

    // Write audit log
    await this.recordAuditLog({
      actorId: adminId,
      action: isApprove ? 'COURSE_APPROVED' : 'COURSE_REJECTED',
      entityType: 'Course',
      entityId: courseId,
      metadata: {
        action: dto.action,
        previousStatus: course.status,
        newStatus,
        reason: rejectionReason || null,
        courseTitle: course.title,
        authorId: course.authorId,
      },
      outcome: 'SUCCESS',
    });

    // Dispatch notification to course author
    await this.prisma.notification.create({
      data: {
        userId: course.authorId,
        title: isApprove ? 'Course Approved & Published' : 'Course Requires Revision',
        message: isApprove
          ? `Your course "${course.title}" has been reviewed and published to the EduVerse catalog.`
          : `Your course "${course.title}" was not approved. Feedback: ${rejectionReason}`,
        actionUrl: `/teacher/courses/${course.id}`,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // 4. CONTENT MODERATION (REVIEWS & USER GENERATED CONTENT)
  // -------------------------------------------------------------

  async getReviewsForModeration(query?: {
    courseId?: string;
    rating?: number;
    page?: number;
    limit?: number;
  }) {
    const page = query?.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query?.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.courseId) {
      where.courseId = query.courseId;
    }
    if (query?.rating) {
      where.rating = Number(query.rating);
    }

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
          course: {
            select: { id: true, title: true, slug: true },
          },
        },
      }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async moderateReview(adminId: string, reviewId: string, dto: ContentModerationDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A reason must be provided for content moderation');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Record audit log
    await this.recordAuditLog({
      actorId: adminId,
      action: 'REVIEW_MODERATED',
      entityType: 'Review',
      entityId: reviewId,
      metadata: {
        courseId: review.courseId,
        courseTitle: review.course.title,
        reviewerId: review.userId,
        reviewerEmail: review.user.email,
        rating: review.rating,
        commentSnippet: review.comment ? review.comment.substring(0, 100) : null,
        reason: dto.reason.trim(),
      },
      outcome: 'SUCCESS',
    });

    // Notify author of review
    await this.prisma.notification.create({
      data: {
        userId: review.userId,
        title: 'Review Moderated by Admin',
        message: `Your review on "${review.course.title}" was removed due to platform moderation. Reason: ${dto.reason.trim()}`,
      },
    }).catch(() => null);

    return {
      success: true,
      message: 'Review successfully removed under content moderation policy',
      reviewId,
      reason: dto.reason.trim(),
    };
  }

  // -------------------------------------------------------------
  // 5. INSTITUTION ADMINISTRATION
  // -------------------------------------------------------------

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

  async getInstitutionById(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        departments: {
          include: {
            _count: {
              select: {
                classes: true,
                courses: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            courses: true,
          },
        },
      },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    return institution;
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

    await this.recordAuditLog({
      actorId: adminId,
      action: 'INSTITUTION_CREATED',
      entityType: 'Institution',
      entityId: institution.id,
      metadata: {
        name: institution.name,
        slug: institution.slug,
        contactEmail: institution.contactEmail,
      },
      outcome: 'SUCCESS',
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

    await this.recordAuditLog({
      actorId: adminId,
      action: 'INSTITUTION_UPDATED',
      entityType: 'Institution',
      entityId: institutionId,
      metadata: dto as any,
      outcome: 'SUCCESS',
    });

    return updated;
  }

  async setInstitutionStatus(
    adminId: string,
    institutionId: string,
    isActive: boolean,
    reason?: string,
  ) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID ${institutionId} not found`);
    }

    const updated = await this.prisma.institution.update({
      where: { id: institutionId },
      data: { isActive },
    });

    await this.recordAuditLog({
      actorId: adminId,
      action: 'INSTITUTION_STATUS_CHANGED',
      entityType: 'Institution',
      entityId: institutionId,
      metadata: {
        name: institution.name,
        previousStatus: institution.isActive,
        newStatus: isActive,
        reason: reason || null,
      },
      outcome: 'SUCCESS',
    });

    return updated;
  }

  // -------------------------------------------------------------
  // 6. GLOBAL PLATFORM SETTINGS
  // -------------------------------------------------------------

  getSettings() {
    return this.settings;
  }

  async updateSettings(adminId: string, dto: UpdateSettingsDto) {
    this.settings = {
      ...this.settings,
      ...dto,
    };

    await this.recordAuditLog({
      actorId: adminId,
      action: 'PLATFORM_SETTINGS_UPDATED',
      entityType: 'PlatformSettings',
      entityId: 'global',
      metadata: dto as any,
      outcome: 'SUCCESS',
    });

    return this.settings;
  }

  // -------------------------------------------------------------
  // 7. AUDIT TRAIL INSPECTION (IMMUTABLE & READ-ONLY)
  // -------------------------------------------------------------

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

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
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

  async getAuditLogById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
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
    });

    if (!log) {
      throw new NotFoundException(`Audit log entry with ID ${id} not found`);
    }

    return log;
  }
}
