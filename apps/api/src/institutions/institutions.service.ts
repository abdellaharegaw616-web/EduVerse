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
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { TenantInviteDto } from './dto/tenant-invite.dto';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';
import { AssignCourseDto } from './dto/assign-course.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

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

  // -------------------------------------------------------------
  // 1. INSTITUTION OVERVIEW & PROFILE
  // -------------------------------------------------------------

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
          { entityType: 'Institution' },
          { entityType: 'InstitutionMember' },
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

  async getProfile(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const institution = await this.prisma.institution.findUnique({
      where: { id: instId },
    });

    if (!institution) {
      throw new NotFoundException(`Institution ${instId} not found`);
    }

    return institution;
  }

  async updateProfile(
    caller: AuthenticatedUser,
    dto: UpdateInstitutionProfileDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const institution = await this.prisma.institution.findUnique({
      where: { id: instId },
    });

    if (!institution) {
      throw new NotFoundException(`Institution ${instId} not found`);
    }

    const updated = await this.prisma.institution.update({
      where: { id: instId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail.toLowerCase().trim(),
        }),
        ...(dto.website !== undefined && { website: dto.website?.trim() || null }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'INSTITUTION_PROFILE_UPDATED',
        entityType: 'Institution',
        entityId: instId,
        metadata: {
          updates: { ...dto },
        },
      },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // 2. MEMBERSHIP MANAGEMENT (MEMBERS, TEACHERS, STUDENTS)
  // -------------------------------------------------------------

  async getMembers(
    caller: AuthenticatedUser,
    query?: { role?: Role; search?: string },
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    return this.prisma.institutionMember.findMany({
      where: {
        institutionId: instId,
        ...(query?.role && { role: query.role }),
        ...(query?.search && {
          user: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        }),
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
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
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

  async updateMemberRole(
    caller: AuthenticatedUser,
    memberId: string,
    dto: UpdateMemberRoleDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const membership = await this.prisma.institutionMember.findFirst({
      where: { id: memberId, institutionId: instId },
    });

    if (!membership) {
      throw new NotFoundException(`Member ${memberId} not found in this institution`);
    }

    if (membership.userId === caller.id && dto.role !== Role.INSTITUTION_ADMIN) {
      throw new ForbiddenException('Cannot demote your own administrative role');
    }

    const updated = await this.prisma.institutionMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'MEMBER_ROLE_UPDATED',
        entityType: 'InstitutionMember',
        entityId: memberId,
        metadata: {
          institutionId: instId,
          targetUserId: membership.userId,
          previousRole: membership.role,
          newRole: dto.role,
        },
      },
    });

    return updated;
  }

  async removeMember(
    caller: AuthenticatedUser,
    memberId: string,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const membership = await this.prisma.institutionMember.findFirst({
      where: { id: memberId, institutionId: instId },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException(`Member ${memberId} not found in this institution`);
    }

    if (membership.userId === caller.id) {
      throw new ForbiddenException('Cannot remove yourself from the institution');
    }

    await this.prisma.institutionMember.delete({
      where: { id: memberId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'MEMBER_REMOVED_FROM_INSTITUTION',
        entityType: 'InstitutionMember',
        entityId: memberId,
        metadata: {
          institutionId: instId,
          targetUserId: membership.userId,
          email: membership.user.email,
        },
      },
    });

    return {
      message: `Member "${membership.user.fullName}" successfully removed from institution`,
    };
  }

  // -------------------------------------------------------------
  // 3. DEPARTMENTS
  // -------------------------------------------------------------

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

  async getDepartment(
    caller: AuthenticatedUser,
    departmentId: string,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        institutionId: instId,
      },
      include: {
        classes: {
          include: {
            teacher: {
              select: { id: true, fullName: true, email: true },
            },
            _count: { select: { enrollments: true } },
          },
        },
        courses: {
          select: { id: true, title: true, status: true, difficulty: true },
        },
        _count: {
          select: { classes: true, courses: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(
        `Department ${departmentId} not found in this institution`,
      );
    }

    return department;
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

  async updateDepartment(
    caller: AuthenticatedUser,
    departmentId: string,
    dto: UpdateDepartmentDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const existing = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        institutionId: instId,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Department ${departmentId} not found in this institution`,
      );
    }

    const normalizedCode = dto.code ? dto.code.toUpperCase().trim() : undefined;

    if (normalizedCode && normalizedCode !== existing.code) {
      const codeConflict = await this.prisma.department.findUnique({
        where: {
          institutionId_code: {
            institutionId: instId,
            code: normalizedCode,
          },
        },
      });

      if (codeConflict) {
        throw new ConflictException(
          `Department with code "${normalizedCode}" already exists in this institution`,
        );
      }
    }

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(normalizedCode !== undefined && { code: normalizedCode }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'DEPARTMENT_UPDATED',
        entityType: 'Department',
        entityId: departmentId,
        metadata: {
          previous: { name: existing.name, code: existing.code },
          updates: { ...dto },
        },
      },
    });

    return updated;
  }

  async deleteDepartment(
    caller: AuthenticatedUser,
    departmentId: string,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const existing = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        institutionId: instId,
      },
      include: {
        _count: {
          select: { classes: true, courses: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Department ${departmentId} not found in this institution`,
      );
    }

    if (existing._count.classes > 0 || existing._count.courses > 0) {
      throw new ConflictException(
        'Cannot delete department that contains active classes or assigned courses. Please reassign or delete them first.',
      );
    }

    await this.prisma.department.delete({
      where: { id: departmentId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'DEPARTMENT_DELETED',
        entityType: 'Department',
        entityId: departmentId,
        metadata: {
          name: existing.name,
          code: existing.code,
          institutionId: instId,
        },
      },
    });

    return { message: `Department "${existing.name}" successfully deleted` };
  }

  // -------------------------------------------------------------
  // 4. CLASSES
  // -------------------------------------------------------------

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

  async getClass(caller: AuthenticatedUser, classId: string, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const classRecord = await this.prisma.class.findFirst({
      where: {
        id: classId,
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
    });

    if (!classRecord) {
      throw new NotFoundException(`Class ${classId} not found in this institution`);
    }

    return classRecord;
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

  async updateClass(
    caller: AuthenticatedUser,
    classId: string,
    dto: UpdateClassDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const classRecord = await this.prisma.class.findFirst({
      where: {
        id: classId,
        department: { institutionId: instId },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class ${classId} not found in this institution`);
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: dto.teacherId },
      });
      if (!teacher) {
        throw new NotFoundException(`Teacher with ID ${dto.teacherId} not found`);
      }
    }

    const updated = await this.prisma.class.update({
      where: { id: classId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId }),
        ...(dto.academicYear !== undefined && {
          academicYear: dto.academicYear.trim(),
        }),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'CLASS_UPDATED',
        entityType: 'Class',
        entityId: classId,
        metadata: {
          updates: { ...dto },
          institutionId: instId,
        },
      },
    });

    return updated;
  }

  async deleteClass(caller: AuthenticatedUser, classId: string, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const classRecord = await this.prisma.class.findFirst({
      where: {
        id: classId,
        department: { institutionId: instId },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class ${classId} not found in this institution`);
    }

    await this.prisma.class.delete({
      where: { id: classId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'CLASS_DELETED',
        entityType: 'Class',
        entityId: classId,
        metadata: {
          name: classRecord.name,
          institutionId: instId,
        },
      },
    });

    return { message: `Class "${classRecord.name}" successfully deleted` };
  }

  // -------------------------------------------------------------
  // 5. ACADEMIC PROGRAMS & INSTITUTION COURSE MANAGEMENT
  // -------------------------------------------------------------

  async getCourses(caller: AuthenticatedUser, institutionId?: string) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    return this.prisma.course.findMany({
      where: { institutionId: instId },
      include: {
        author: {
          select: { id: true, fullName: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { sections: true, enrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignCourse(
    caller: AuthenticatedUser,
    courseId: string,
    dto: AssignCourseDto,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    if (course.institutionId && course.institutionId !== instId) {
      throw new ForbiddenException(
        'This course is already associated with another institution',
      );
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, institutionId: instId },
      });
      if (!dept) {
        throw new NotFoundException(
          `Department ${dto.departmentId} not found in this institution`,
        );
      }
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        institutionId: instId,
        departmentId: dto.departmentId || null,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'COURSE_ASSIGNED_TO_INSTITUTION',
        entityType: 'Course',
        entityId: courseId,
        metadata: {
          institutionId: instId,
          departmentId: dto.departmentId || null,
        },
      },
    });

    return updated;
  }

  async unassignCourse(
    caller: AuthenticatedUser,
    courseId: string,
    institutionId?: string,
  ) {
    const instId = await this.resolveInstitutionId(caller, institutionId);

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, institutionId: instId },
    });

    if (!course) {
      throw new NotFoundException(
        `Course ${courseId} is not associated with this institution`,
      );
    }

    await this.prisma.course.update({
      where: { id: courseId },
      data: {
        institutionId: null,
        departmentId: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'COURSE_UNASSIGNED_FROM_INSTITUTION',
        entityType: 'Course',
        entityId: courseId,
        metadata: {
          previousInstitutionId: instId,
        },
      },
    });

    return { message: `Course "${course.title}" successfully removed from institution` };
  }

  // -------------------------------------------------------------
  // 6. INVITATIONS (FACULTY & STUDENTS)
  // -------------------------------------------------------------

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
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if target user is already a member of this institution
    const existingMember = await this.prisma.institutionMember.findFirst({
      where: {
        institutionId: instId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        `User "${normalizedEmail}" is already an active member of this institution`,
      );
    }

    // Check if there is an active pending invitation
    const pendingInvite = await this.prisma.invitation.findFirst({
      where: {
        institutionId: instId,
        email: normalizedEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvite) {
      throw new ConflictException(
        `An active invitation for "${normalizedEmail}" is already pending`,
      );
    }

    return this.usersService.createInvitation(caller, {
      email: normalizedEmail,
      role: dto.role,
      institutionId: instId,
    });
  }

  // -------------------------------------------------------------
  // 7. INSTITUTION REPORTS
  // -------------------------------------------------------------

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
}
