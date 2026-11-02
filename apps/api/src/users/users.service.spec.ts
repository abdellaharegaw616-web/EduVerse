import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService, Role } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let mailService: any;

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: 'superadmin@eduverse.et',
    role: Role.SUPER_ADMIN,
    fullName: 'Super Administrator',
    isActive: true,
    isEmailVerified: true,
  };

  const mockInstAdminUser: AuthenticatedUser = {
    id: 'inst-admin-uuid-2',
    email: 'aau.admin@eduverse.et',
    role: Role.INSTITUTION_ADMIN,
    fullName: 'AAU Administrator',
    isActive: true,
    isEmailVerified: true,
  };

  const mockStudentUser: AuthenticatedUser = {
    id: 'student-uuid-3',
    email: 'student@eduverse.et',
    role: Role.STUDENT,
    fullName: 'Test Student',
    isActive: true,
    isEmailVerified: true,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userProfile: {
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
      institutionMember: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      invitation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('should return user profile with institutions if found', async () => {
      const mockResult = {
        id: 'user-1',
        email: 'user1@eduverse.et',
        fullName: 'User One',
        role: Role.STUDENT,
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        profile: { bio: 'Learning computer science' },
        institutionMemberships: [],
      };
      prisma.user.findUnique.mockResolvedValue(mockResult);

      const result = await service.getProfile('user-1');
      expect(result).toEqual(mockResult);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user profile not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user fullName and upsert user profile', async () => {
      prisma.user.update.mockResolvedValue({ id: 'user-1', fullName: 'Updated Name' });
      prisma.userProfile.upsert.mockResolvedValue({
        userId: 'user-1',
        bio: 'Updated Bio',
        avatarUrl: 'https://cdn.eduverse.et/avatars/user-1.jpg',
        phoneNumber: '+251911223344',
        timezone: 'Africa/Addis_Ababa',
      });

      const result = await service.updateProfile('user-1', {
        fullName: 'Updated Name',
        bio: 'Updated Bio',
        avatarUrl: 'https://cdn.eduverse.et/avatars/user-1.jpg',
        phoneNumber: '+251911223344',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fullName: 'Updated Name' },
      });
      expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
      expect(result).toHaveProperty('avatarUrl', 'https://cdn.eduverse.et/avatars/user-1.jpg');
    });
  });

  describe('updateUserRole', () => {
    it('should throw NotFoundException if target user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole(mockAdminUser, 'non-existent', Role.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing user without update if role is identical', async () => {
      const existingUser = {
        id: 'user-target-1',
        email: 'teacher@eduverse.et',
        role: Role.TEACHER,
      };
      prisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.updateUserRole(
        mockAdminUser,
        'user-target-1',
        Role.TEACHER,
      );

      expect(result).toEqual(existingUser);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should update user role and log to AuditLog', async () => {
      const existingUser = {
        id: 'user-target-1',
        email: 'faculty@eduverse.et',
        role: Role.STUDENT,
      };
      const updatedUser = {
        id: 'user-target-1',
        email: 'faculty@eduverse.et',
        fullName: 'Faculty Member',
        role: Role.TEACHER,
        isActive: true,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateUserRole(
        mockAdminUser,
        'user-target-1',
        Role.TEACHER,
      );

      expect(result.role).toBe(Role.TEACHER);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-target-1' },
        data: { role: Role.TEACHER },
        select: expect.any(Object),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockAdminUser.id,
          action: 'USER_ROLE_ASSIGNED',
          entityType: 'User',
          entityId: 'user-target-1',
          metadata: {
            previousRole: Role.STUDENT,
            assignedRole: Role.TEACHER,
            adminEmail: mockAdminUser.email,
          },
        },
      });
    });
  });

  describe('setUserStatus', () => {
    it('should throw NotFoundException if target user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setUserStatus(mockAdminUser, 'target-uuid', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent suspending a SUPER_ADMIN account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'super-admin-target',
        role: Role.SUPER_ADMIN,
        email: 'root@eduverse.et',
      });

      await expect(
        service.setUserStatus(mockAdminUser, 'super-admin-target', { isActive: false }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should suspend user, revoke all active refresh tokens, and audit action', async () => {
      const target = {
        id: 'violator-1',
        role: Role.STUDENT,
        email: 'violator@eduverse.et',
      };
      prisma.user.findUnique.mockResolvedValue(target);
      prisma.user.update.mockResolvedValue({
        ...target,
        isActive: false,
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.setUserStatus(mockAdminUser, 'violator-1', {
        isActive: false,
        reason: 'Terms of Service violation',
      });

      expect(result.isActive).toBe(false);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'violator-1' },
        data: { isRevoked: true },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockAdminUser.id,
          action: 'USER_ACCOUNT_SUSPENDED',
          entityType: 'User',
          entityId: 'violator-1',
          metadata: {
            reason: 'Terms of Service violation',
            adminEmail: mockAdminUser.email,
          },
        },
      });
    });

    it('should reactivate a suspended user and audit action', async () => {
      const target = {
        id: 'rehabilitated-1',
        role: Role.TEACHER,
        email: 'teacher@eduverse.et',
      };
      prisma.user.findUnique.mockResolvedValue(target);
      prisma.user.update.mockResolvedValue({
        ...target,
        isActive: true,
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.setUserStatus(mockAdminUser, 'rehabilitated-1', {
        isActive: true,
        reason: 'Appeal approved',
      });

      expect(result.isActive).toBe(true);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockAdminUser.id,
          action: 'USER_ACCOUNT_REACTIVATED',
          entityType: 'User',
          entityId: 'rehabilitated-1',
          metadata: {
            reason: 'Appeal approved',
            adminEmail: mockAdminUser.email,
          },
        },
      });
    });
  });

  describe('createInvitation', () => {
    it('should forbid inviting SUPER_ADMIN via invitation token', async () => {
      await expect(
        service.createInvitation(mockAdminUser, {
          email: 'newadmin@eduverse.et',
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid invitation if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createInvitation(mockAdminUser, {
          email: 'existing@eduverse.et',
          role: Role.TEACHER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should enforce institution boundary for INSTITUTION_ADMIN caller', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: 'inst-aau-123',
        userId: mockInstAdminUser.id,
      });
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-1',
        email: 'lecturer@aau.edu.et',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.createInvitation(mockInstAdminUser, {
        email: 'lecturer@aau.edu.et',
        role: Role.TEACHER,
      });

      expect(result).toHaveProperty('invitationId', 'inv-1');
      expect(prisma.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institutionId: 'inst-aau-123',
            invitedById: mockInstAdminUser.id,
          }),
        }),
      );
      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('acceptInvitation', () => {
    it('should throw BadRequestException if token is not found', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation({
          token: 'invalid-token',
          fullName: 'New Teacher',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invitation has already been accepted', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.acceptInvitation({
          token: 'accepted-token',
          fullName: 'New Teacher',
          password: 'Password123!',
        }),
      ).rejects.toThrow('This invitation has already been accepted');
    });

    it('should throw BadRequestException if invitation is expired', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 100000), // Past
      });

      await expect(
        service.acceptInvitation({
          token: 'expired-token',
          fullName: 'New Teacher',
          password: 'Password123!',
        }),
      ).rejects.toThrow('Invitation has expired. Please request a new invite.');
    });

    it('should create user, link to institution, and mark invitation accepted', async () => {
      const validInvitation = {
        id: 'inv-valid-1',
        email: 'invited@aau.edu.et',
        role: Role.TEACHER,
        institutionId: 'inst-1',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      };

      const createdUser = {
        id: 'new-user-1',
        email: 'invited@aau.edu.et',
        fullName: 'Invited Teacher',
        role: Role.TEACHER,
        createdAt: new Date(),
      };

      prisma.invitation.findUnique.mockResolvedValue(validInvitation);
      prisma.user.create.mockResolvedValue(createdUser);
      prisma.institutionMember.create.mockResolvedValue({});
      prisma.invitation.update.mockResolvedValue({});

      const result = await service.acceptInvitation({
        token: 'valid-secret-token',
        fullName: 'Invited Teacher',
        password: 'SecurePassword123!',
      });

      expect(result).toHaveProperty('message');
      expect(result.user).toEqual(createdUser);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'invited@aau.edu.et',
            role: Role.TEACHER,
            isEmailVerified: true,
          }),
        }),
      );
      expect(prisma.institutionMember.create).toHaveBeenCalledWith({
        data: {
          institutionId: 'inst-1',
          userId: 'new-user-1',
          role: Role.TEACHER,
        },
      });
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-valid-1' },
        data: { acceptedAt: expect.any(Date) },
      });
    });
  });

  describe('listUsers', () => {
    it('SUPER_ADMIN should list users with search and role filters', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', email: 'u1@eduverse.et', role: Role.STUDENT },
      ]);

      const result = await service.listUsers(mockAdminUser, {
        role: Role.STUDENT,
        search: 'u1',
      });

      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: Role.STUDENT,
          }),
        }),
      );
    });

    it('INSTITUTION_ADMIN should only list users from their institution', async () => {
      prisma.institutionMember.findFirst.mockResolvedValue({
        institutionId: 'inst-aau',
        userId: mockInstAdminUser.id,
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'u2', email: 'u2@aau.edu.et', role: Role.TEACHER },
      ]);

      const result = await service.listUsers(mockInstAdminUser, { role: Role.TEACHER });

      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionMemberships: {
              some: { institutionId: 'inst-aau' },
            },
          }),
        }),
      );
    });

    it('STUDENT should be forbidden from listing directory', async () => {
      await expect(
        service.listUsers(mockStudentUser, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
