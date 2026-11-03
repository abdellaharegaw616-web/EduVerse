import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { PrismaService, Role } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let prisma: any;
  let usersService: any;

  const mockInstAdmin: AuthenticatedUser = {
    id: 'inst-admin-1',
    email: 'admin@aau.edu.et',
    role: Role.INSTITUTION_ADMIN,
    fullName: 'AAU Admin',
    isActive: true,
    isEmailVerified: true,
  };

  const mockSuperAdmin: AuthenticatedUser = {
    id: 'super-admin-1',
    email: 'root@eduverse.et',
    role: Role.SUPER_ADMIN,
    fullName: 'Platform Super Admin',
    isActive: true,
    isEmailVerified: true,
  };

  const mockStudent: AuthenticatedUser = {
    id: 'student-1',
    email: 'student@aau.edu.et',
    role: Role.STUDENT,
    fullName: 'Abebe Bikila',
    isActive: true,
    isEmailVerified: true,
  };

  const targetInstitutionId = '11111111-1111-4000-8000-000000000001';
  const foreignInstitutionId = '22222222-2222-4000-8000-000000000002';

  beforeEach(async () => {
    prisma = {
      institution: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      institutionMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      course: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      enrollment: {
        count: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      invitation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    usersService = {
      createInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    service = module.get<InstitutionsService>(InstitutionsService);
  });

  describe('resolveInstitutionId & Multi-Tenant Boundary', () => {
    it('should resolve own institutionId for verified INSTITUTION_ADMIN', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });

      const res = await service.resolveInstitutionId(mockInstAdmin);
      expect(res).toBe(targetInstitutionId);
    });

    it('should throw ForbiddenException if INSTITUTION_ADMIN attempts cross-tenant access', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });

      await expect(
        service.resolveInstitutionId(mockInstAdmin, foreignInstitutionId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthorized roles (e.g. STUDENT)', async () => {
      await expect(service.resolveInstitutionId(mockStudent)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should permit SUPER_ADMIN to inspect any tenant', async () => {
      prisma.institution.findUnique.mockResolvedValue({ id: foreignInstitutionId });

      const res = await service.resolveInstitutionId(
        mockSuperAdmin,
        foreignInstitutionId,
      );
      expect(res).toBe(foreignInstitutionId);
    });

    it('should throw NotFoundException if SUPER_ADMIN accesses non-existent institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveInstitutionId(mockSuperAdmin, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Institution Profile Management', () => {
    it('should retrieve institution profile for tenant admin', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
      prisma.institution.findUnique.mockResolvedValue({
        id: targetInstitutionId,
        name: 'Addis Ababa University',
        slug: 'aau',
        contactEmail: 'admin@aau.edu.et',
        website: 'https://www.aau.edu.et',
      });

      const profile = await service.getProfile(mockInstAdmin);
      expect(profile.name).toBe('Addis Ababa University');
      expect(profile.id).toBe(targetInstitutionId);
    });

    it('should update profile and write audit log', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
      prisma.institution.findUnique.mockResolvedValue({
        id: targetInstitutionId,
        name: 'Old Name',
      });
      prisma.institution.update.mockResolvedValue({
        id: targetInstitutionId,
        name: 'AAU Updated',
        contactEmail: 'info@aau.edu.et',
        website: 'https://new.aau.edu.et',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const updated = await service.updateProfile(mockInstAdmin, {
        name: 'AAU Updated',
        contactEmail: 'info@aau.edu.et',
        website: 'https://new.aau.edu.et',
      });

      expect(updated.name).toBe('AAU Updated');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTITUTION_PROFILE_UPDATED',
            entityType: 'Institution',
            entityId: targetInstitutionId,
          }),
        }),
      );
    });
  });

  describe('Departments Management', () => {
    beforeEach(() => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
    });

    it('should list departments scoped to the caller institution', async () => {
      prisma.department.findMany.mockResolvedValue([
        { id: 'dept-1', name: 'Computer Science', code: 'CS', _count: { courses: 2, classes: 3 } },
      ]);

      const depts = await service.getDepartments(mockInstAdmin);
      expect(depts).toHaveLength(1);
      expect(prisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institutionId: targetInstitutionId },
        }),
      );
    });

    it('should retrieve single department with classes and courses', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Computer Science',
        code: 'CS',
        classes: [],
        courses: [],
        _count: { classes: 0, courses: 0 },
      });

      const dept = await service.getDepartment(mockInstAdmin, 'dept-1');
      expect(dept.id).toBe('dept-1');
    });

    it('should throw NotFoundException if department does not belong to institution', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(service.getDepartment(mockInstAdmin, 'foreign-dept')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if department code already exists in institution', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 'existing-dept' });

      await expect(
        service.createDepartment(mockInstAdmin, {
          name: 'Computer Science',
          code: 'CS',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create department and write audit log', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      prisma.department.create.mockResolvedValue({
        id: 'new-dept-id',
        name: 'Electrical Engineering',
        code: 'EE',
        institutionId: targetInstitutionId,
      });
      prisma.auditLog.create.mockResolvedValue({});

      const dept = await service.createDepartment(mockInstAdmin, {
        name: 'Electrical Engineering',
        code: 'EE',
      });

      expect(dept.id).toBe('new-dept-id');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DEPARTMENT_CREATED',
            entityType: 'Department',
          }),
        }),
      );
    });

    it('should update department details and handle code conflict check', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Old Dept',
        code: 'OLD',
      });
      prisma.department.findUnique.mockResolvedValue(null);
      prisma.department.update.mockResolvedValue({
        id: 'dept-1',
        name: 'New Dept Name',
        code: 'NEW',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const updated = await service.updateDepartment(mockInstAdmin, 'dept-1', {
        name: 'New Dept Name',
        code: 'NEW',
      });

      expect(updated.name).toBe('New Dept Name');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DEPARTMENT_UPDATED',
          }),
        }),
      );
    });

    it('should delete empty department', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Empty Dept',
        code: 'EMP',
        _count: { classes: 0, courses: 0 },
      });
      prisma.department.delete.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.deleteDepartment(mockInstAdmin, 'dept-1');
      expect(res.message).toContain('successfully deleted');
    });

    it('should throw ConflictException when deleting department with active classes', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Active Dept',
        code: 'ACT',
        _count: { classes: 2, courses: 0 },
      });

      await expect(service.deleteDepartment(mockInstAdmin, 'dept-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('Classes Management', () => {
    beforeEach(() => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
    });

    it('should throw NotFoundException if department does not belong to caller institution', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.createClass(mockInstAdmin, {
          name: 'Section 1',
          departmentId: 'invalid-dept',
          teacherId: 'teacher-1',
          academicYear: '2026',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if teacher does not exist', async () => {
      prisma.department.findFirst.mockResolvedValue({ id: 'valid-dept' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createClass(mockInstAdmin, {
          name: 'Section 1',
          departmentId: 'valid-dept',
          teacherId: 'invalid-teacher',
          academicYear: '2026',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create class successfully and write audit log', async () => {
      prisma.department.findFirst.mockResolvedValue({ id: 'valid-dept' });
      prisma.user.findUnique.mockResolvedValue({ id: 'teacher-1', fullName: 'Dr. Abebe' });
      prisma.class.create.mockResolvedValue({
        id: 'class-1',
        name: 'Section 1',
        departmentId: 'valid-dept',
        teacherId: 'teacher-1',
        academicYear: '2026',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const newClass = await service.createClass(mockInstAdmin, {
        name: 'Section 1',
        departmentId: 'valid-dept',
        teacherId: 'teacher-1',
        academicYear: '2026',
      });

      expect(newClass.id).toBe('class-1');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CLASS_CREATED',
            entityType: 'Class',
          }),
        }),
      );
    });

    it('should update class and write audit log', async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: 'class-1',
        name: 'Old Name',
      });
      prisma.class.update.mockResolvedValue({
        id: 'class-1',
        name: 'New Class Name',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const updated = await service.updateClass(mockInstAdmin, 'class-1', {
        name: 'New Class Name',
      });

      expect(updated.name).toBe('New Class Name');
    });

    it('should delete class and write audit log', async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: 'class-1',
        name: 'Class to Delete',
      });
      prisma.class.delete.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.deleteClass(mockInstAdmin, 'class-1');
      expect(res.message).toContain('successfully deleted');
    });
  });

  describe('Academic Programs & Course Management', () => {
    beforeEach(() => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
    });

    it('should list courses affiliated with caller institution', async () => {
      prisma.course.findMany.mockResolvedValue([
        { id: 'course-1', title: 'Intro to Algorithms', institutionId: targetInstitutionId },
      ]);

      const courses = await service.getCourses(mockInstAdmin);
      expect(courses).toHaveLength(1);
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institutionId: targetInstitutionId },
        }),
      );
    });

    it('should assign a course to institution and department', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        title: 'Intro to Algorithms',
        institutionId: null,
      });
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        institutionId: targetInstitutionId,
      });
      prisma.course.update.mockResolvedValue({
        id: 'course-1',
        institutionId: targetInstitutionId,
        departmentId: 'dept-1',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const assigned = await service.assignCourse(mockInstAdmin, 'course-1', {
        departmentId: 'dept-1',
      });

      expect(assigned.institutionId).toBe(targetInstitutionId);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COURSE_ASSIGNED_TO_INSTITUTION',
          }),
        }),
      );
    });

    it('should throw ForbiddenException if course already belongs to another institution', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'course-1',
        institutionId: foreignInstitutionId,
      });

      await expect(
        service.assignCourse(mockInstAdmin, 'course-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should unassign a course from caller institution', async () => {
      prisma.course.findFirst.mockResolvedValue({
        id: 'course-1',
        title: 'Algorithms',
        institutionId: targetInstitutionId,
      });
      prisma.course.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.unassignCourse(mockInstAdmin, 'course-1');
      expect(res.message).toContain('successfully removed');
    });

    it('should throw NotFoundException if unassigning a course not in caller institution', async () => {
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.unassignCourse(mockInstAdmin, 'foreign-course')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Membership Management', () => {
    beforeEach(() => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
    });

    it('should list all members of the institution', async () => {
      prisma.institutionMember.findMany.mockResolvedValue([
        { id: 'm-1', role: Role.TEACHER, user: { fullName: 'Dr. Abebe' } },
        { id: 'm-2', role: Role.STUDENT, user: { fullName: 'Alemayehu' } },
      ]);

      const members = await service.getMembers(mockInstAdmin);
      expect(members).toHaveLength(2);
    });

    it('should update member role and write audit log', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        id: 'm-1',
        userId: 'other-user',
        institutionId: targetInstitutionId,
        role: Role.TEACHER,
      });
      prisma.institutionMember.update.mockResolvedValue({
        id: 'm-1',
        role: Role.INSTITUTION_ADMIN,
        user: { id: 'other-user', fullName: 'Dr. Abebe', email: 'abebe@aau.edu.et' },
      });
      prisma.auditLog.create.mockResolvedValue({});

      const updated = await service.updateMemberRole(mockInstAdmin, 'm-1', {
        role: Role.INSTITUTION_ADMIN,
      });

      expect(updated.role).toBe(Role.INSTITUTION_ADMIN);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'MEMBER_ROLE_UPDATED',
          }),
        }),
      );
    });

    it('should prevent admin from demoting themselves', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        id: 'm-self',
        userId: mockInstAdmin.id,
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });

      await expect(
        service.updateMemberRole(mockInstAdmin, 'm-self', { role: Role.STUDENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should remove member from institution and write audit log', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        id: 'm-2',
        userId: 'user-2',
        institutionId: targetInstitutionId,
        user: { fullName: 'User Two', email: 'user2@aau.edu.et' },
      });
      prisma.institutionMember.delete.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await service.removeMember(mockInstAdmin, 'm-2');
      expect(res.message).toContain('successfully removed');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'MEMBER_REMOVED_FROM_INSTITUTION',
          }),
        }),
      );
    });

    it('should prevent admin from removing themselves from the institution', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        id: 'm-self',
        userId: mockInstAdmin.id,
        institutionId: targetInstitutionId,
        user: { fullName: 'Admin Self', email: 'admin@aau.edu.et' },
      });

      await expect(service.removeMember(mockInstAdmin, 'm-self')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Invitations & Duplicate Protection', () => {
    beforeEach(() => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
    });

    it('should throw ConflictException if target is already a member', async () => {
      // First call for resolveInstitutionId returns admin membership
      prisma.institutionMember.findFirst
        .mockResolvedValueOnce({
          institutionId: targetInstitutionId,
          role: Role.INSTITUTION_ADMIN,
        })
        .mockResolvedValueOnce({
          id: 'existing-member',
          institutionId: targetInstitutionId,
        });

      await expect(
        service.createInvitation(mockInstAdmin, {
          email: 'already.member@aau.edu.et',
          role: Role.TEACHER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if an active invitation is already pending', async () => {
      prisma.institutionMember.findFirst
        .mockResolvedValueOnce({
          institutionId: targetInstitutionId,
          role: Role.INSTITUTION_ADMIN,
        })
        .mockResolvedValueOnce(null); // not a member

      prisma.invitation.findFirst.mockResolvedValue({
        id: 'pending-invitation',
        email: 'pending@aau.edu.et',
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(
        service.createInvitation(mockInstAdmin, {
          email: 'pending@aau.edu.et',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should dispatch student invitation when valid', async () => {
      prisma.institutionMember.findFirst
        .mockResolvedValueOnce({
          institutionId: targetInstitutionId,
          role: Role.INSTITUTION_ADMIN,
        })
        .mockResolvedValueOnce(null);

      prisma.invitation.findFirst.mockResolvedValue(null);

      usersService.createInvitation.mockResolvedValue({
        message: 'Invitation successfully sent to new.student@aau.edu.et',
        invitationId: 'invite-stud-1',
        expiresAt: new Date(),
      });

      const res = await service.createInvitation(mockInstAdmin, {
        email: 'new.student@aau.edu.et',
        role: Role.STUDENT,
      });

      expect(usersService.createInvitation).toHaveBeenCalledWith(
        mockInstAdmin,
        expect.objectContaining({
          email: 'new.student@aau.edu.et',
          role: Role.STUDENT,
          institutionId: targetInstitutionId,
        }),
      );
      expect(res.invitationId).toBe('invite-stud-1');
    });
  });

  describe('Institution Reports & Telemetry', () => {
    it('should compile complete institution report', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });

      prisma.department.findMany.mockResolvedValue([
        { id: 'dept-1', name: 'CS', code: 'CS', _count: { classes: 2, courses: 3 } },
      ]);
      prisma.class.findMany.mockResolvedValue([
        { id: 'c-1', _count: { enrollments: 40 } },
        { id: 'c-2', _count: { enrollments: 35 } },
      ]);
      prisma.institutionMember.count
        .mockResolvedValueOnce(5)  // teachers
        .mockResolvedValueOnce(150); // students
      prisma.course.findMany.mockResolvedValue([
        { id: 'course-1', title: 'Algorithms', status: 'PUBLISHED' },
        { id: 'course-2', title: 'Data Bases', status: 'DRAFT' },
      ]);

      const report = await service.getReports(mockInstAdmin);
      expect(report.institutionId).toBe(targetInstitutionId);
      expect(report.metrics.teacherCount).toBe(5);
      expect(report.metrics.studentCount).toBe(150);
      expect(report.metrics.studentTeacherRatio).toBe('30.0');
      expect(report.metrics.totalClasses).toBe(2);
      expect(report.metrics.totalClassEnrollments).toBe(75);
      expect(report.metrics.averageClassSize).toBe(38);
      expect(report.metrics.coursesCount).toBe(2);
      expect(report.metrics.publishedCoursesCount).toBe(1);
    });
  });
});
