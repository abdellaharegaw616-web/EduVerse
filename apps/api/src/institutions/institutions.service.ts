import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService, Role } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { TenantInviteDto } from './dto/tenant-invite.dto';

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Enforces strict multi-tenant boundary.
   * If caller is INSTITUTION_ADMIN, they can only access their assigned institution.
   * Attempting to access another institutionId throws a 403 ForbiddenException.
   */
  async resolveInstitutionId(
    caller: AuthenticatedUser,
    explicitInstitutionId?: string,
  ): Promise<string> {
    if (caller.role === Role.SUPER_ADMIN) {
      if (explicitInstitutionId) {
        const inst = await this.prisma.institution.findUnique({
          where: { id: explicitInstitutionId },
        });
        if (!inst) {
          throw new NotFoundException(`Institution ${explicitInstitutionId} not found`);
        }
        return inst.id;
      }
      const first = await this.prisma.institution.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!first) {
        throw new NotFoundException('No active institutions found on the platform');
      }
      return first.id;
    }

    if (caller.role === Role.INSTITUTION_ADMIN) {
      const membership = await this.prisma.institutionMember.findFirst({
        where: {
          userId: caller.id,
          role: Role.INSTITUTION_ADMIN,
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You are not associated with any active institution administration',
        );
      }

      if (explicitInstitutionId && explicitInstitutionId !== membership.institutionId) {
        throw new ForbiddenException(
          'Cross-institution access is strictly forbidden. You can only manage your own institution.',
        );
      }

      return membership.institutionId;
    }

    throw new ForbiddenException('Institutional administration privileges required');
  }

  async getOverview(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const institution = await this.prisma.institution.findUnique({
      where: { id: instId },
    });

    if (!institution) {
      throw new NotFoundException(`Institution ${instId} not found`);
    }

    const [
      totalTeachers,
      totalStudents,
      totalDepartments,
      totalClasses,
      totalCourses,
      totalEnrollments,
    ] = await Promise.all([
      this.prisma.institutionMember.count({
        where: { institutionId: instId, role: Role.TEACHER },
      }),
      this.prisma.institutionMember.count({
        where: { institutionId: instId, role: Role.STUDENT },
      }),
      this.prisma.department.count({
        where: { institutionId: instId },
      }),
      this.prisma.class.count({
        where: { department: { institutionId: instId } },
      }),
      this.prisma.course.count({
        where: { institutionId: instId },
      }),
      this.prisma.enrollment.count({
        where: { course: { institutionId: instId } },
      }),
    ]);

    const recentAudit = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'Department' },
          { entityType: 'Class' },
          { entityType: 'Invitation' },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      institution: {
        id: institution.id,
        name: institution.name,
        slug: institution.slug,
        domain: institution.domain,
        contactEmail: institution.contactEmail,
        website: institution.website,
        isActive: institution.isActive,
        createdAt: institution.createdAt,
      },
      metrics: {
        totalTeachers,
        totalStudents,
        totalDepartments,
        totalClasses,
        totalCourses,
        totalEnrollments,
      },
      recentActivity: recentAudit,
    };
  }

  async getTeachers(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const members = await this.prisma.institutionMember.findMany({
      where: {
        institutionId: instId,
        role: Role.TEACHER,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            createdAt: true,
            profile: {
              select: {
                avatarUrl: true,
                phoneNumber: true,
              },
            },
            taughtClasses: {
              where: { department: { institutionId: instId } },
              select: {
                id: true,
                name: true,
                academicYear: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.user.id,
      membershipId: m.id,
      fullName: m.user.fullName,
      email: m.user.email,
      isActive: m.user.isActive,
      joinedAt: m.joinedAt,
      avatarUrl: m.user.profile?.avatarUrl || null,
      phoneNumber: m.user.profile?.phoneNumber || null,
      assignedClasses: m.user.taughtClasses,
      classCount: m.user.taughtClasses.length,
    }));
  }

  async getStudents(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const members = await this.prisma.institutionMember.findMany({
      where: {
        institutionId: instId,
        role: Role.STUDENT,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            createdAt: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                certificates: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.user.id,
      membershipId: m.id,
      fullName: m.user.fullName,
      email: m.user.email,
      isActive: m.user.isActive,
      joinedAt: m.joinedAt,
      avatarUrl: m.user.profile?.avatarUrl || null,
      enrollmentCount: m.user._count.enrollments,
      certificateCount: m.user._count.certificates,
    }));
  }

  async getDepartments(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    return this.prisma.department.findMany({
      where: { institutionId: instId },
      include: {
        _count: {
          select: {
            courses: true,
            classes: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(
    caller: AuthenticatedUser,
    dto: CreateDepartmentDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);
    const normalizedCode = dto.code.toUpperCase().trim();

    const existing = await this.prisma.department.findUnique({
      where: {
        institutionId_code: {
          institutionId: instId,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Department with code "${normalizedCode}" already exists in this institution`,
      );
    }

    const department = await this.prisma.department.create({
      data: {
        institutionId: instId,
        name: dto.name.trim(),
        code: normalizedCode,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'DEPARTMENT_CREATED',
        entityType: 'Department',
        entityId: department.id,
        metadata: {
          institutionId: instId,
          name: department.name,
          code: department.code,
        },
      },
    });

    return department;
  }

  async getClasses(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    return this.prisma.class.findMany({
      where: {
        department: { institutionId: instId },
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createClass(
    caller: AuthenticatedUser,
    dto: CreateClassDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const department = await this.prisma.department.findFirst({
      where: {
        id: dto.departmentId,
        institutionId: instId,
      },
    });

    if (!department) {
      throw new NotFoundException(
        `Department ${dto.departmentId} not found in this institution`,
      );
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${dto.teacherId} not found`);
    }

    const newClass = await this.prisma.class.create({
      data: {
        departmentId: dto.departmentId,
        teacherId: dto.teacherId,
        name: dto.name.trim(),
        academicYear: dto.academicYear.trim(),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'CLASS_CREATED',
        entityType: 'Class',
        entityId: newClass.id,
        metadata: {
          institutionId: instId,
          departmentId: dto.departmentId,
          teacherId: dto.teacherId,
          name: newClass.name,
        },
      },
    });

    return newClass;
  }

  async getReports(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const [departments, classes, teachersCount, studentsCount, courses] =
      await Promise.all([
        this.prisma.department.findMany({
          where: { institutionId: instId },
          include: {
            _count: {
              select: {
                classes: true,
                courses: true,
              },
            },
          },
        }),
        this.prisma.class.findMany({
          where: { department: { institutionId: instId } },
          include: {
            _count: {
              select: { enrollments: true },
            },
          },
        }),
        this.prisma.institutionMember.count({
          where: { institutionId: instId, role: Role.TEACHER },
        }),
        this.prisma.institutionMember.count({
          where: { institutionId: instId, role: Role.STUDENT },
        }),
        this.prisma.course.findMany({
          where: { institutionId: instId },
          select: { id: true, title: true, status: true },
        }),
      ]);

    const totalClassEnrollments = classes.reduce(
      (sum, c) => sum + c._count.enrollments,
      0,
    );

    return {
      institutionId: instId,
      departmentDistribution: departments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        classCount: d._count.classes,
        courseCount: d._count.courses,
      })),
      metrics: {
        teacherCount: teachersCount,
        studentCount: studentsCount,
        studentTeacherRatio:
          teachersCount > 0 ? (studentsCount / teachersCount).toFixed(1) : 'N/A',
        totalClasses: classes.length,
        totalClassEnrollments,
        averageClassSize:
          classes.length > 0
            ? Math.round(totalClassEnrollments / classes.length)
            : 0,
        coursesCount: courses.length,
        publishedCoursesCount: courses.filter((c) => c.status === 'PUBLISHED').length,
      },
    };
  }

  async getInvitations(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    return this.prisma.invitation.findMany({
      where: { institutionId: instId },
      include: {
        invitedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInvitation(
    caller: AuthenticatedUser,
    dto: TenantInviteDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    return this.usersService.createInvitation(caller, {
      email: dto.email,
      role: dto.role,
      institutionId: instId,
    });
  }
}

