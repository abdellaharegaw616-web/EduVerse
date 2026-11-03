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
      },
      institutionMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      class: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      course: {
        findMany: jest.fn(),
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
  });

  describe('createDepartment', () => {
    it('should throw ConflictException if department code already exists in institution', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
      prisma.department.findUnique.mockResolvedValue({ id: 'existing-dept' });

      await expect(
        service.createDepartment(mockInstAdmin, {
          name: 'Computer Science',
          code: 'CS',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create department and write audit log', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
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
  });

  describe('createClass', () => {
    it('should throw NotFoundException if department does not belong to caller institution', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
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
  });

  describe('createInvitation', () => {
    it('should delegate to usersService with resolved institutionId', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: targetInstitutionId,
        role: Role.INSTITUTION_ADMIN,
      });
      usersService.createInvitation.mockResolvedValue({
        message: 'Faculty invitation successfully created',
        invitationId: 'invite-1',
        expiresAt: new Date(),
      });

      const res = await service.createInvitation(mockInstAdmin, {
        email: 'prof.kebede@aau.edu.et',
        role: Role.TEACHER,
      });

      expect(usersService.createInvitation).toHaveBeenCalledWith(
        mockInstAdmin,
        expect.objectContaining({
          email: 'prof.kebede@aau.edu.et',
          role: Role.TEACHER,
          institutionId: targetInstitutionId,
        }),
      );
      expect(res.invitationId).toBe('invite-1');
    });
  });
});

