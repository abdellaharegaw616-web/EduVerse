import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';

import { AppModule } from '../src/app.module';
import { PrismaService, Role } from '../src/database/prisma.service';
import { MailService } from '../src/mail/mail.service';

describe('Role & Authorization RBAC Matrix (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: any;
  let mockMail: any;

  interface TestUser {
    id: string;
    email: string;
    role: Role;
    fullName: string;
    isActive: boolean;
    isEmailVerified: boolean;
  }

  // 1. Five Distinct System Roles + 1 Suspended User + 1 Target User
  const superAdmin: TestUser = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'superadmin@eduverse.et',
    role: Role.SUPER_ADMIN,
    fullName: 'Root Super Admin',
    isActive: true,
    isEmailVerified: true,
  };

  const institutionAdmin: TestUser = {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'admin@aau.edu.et',
    role: Role.INSTITUTION_ADMIN,
    fullName: 'AAU Institutional Admin',
    isActive: true,
    isEmailVerified: true,
  };

  const teacher: TestUser = {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'teacher@aau.edu.et',
    role: Role.TEACHER,
    fullName: 'Dr. Abebe Teacher',
    isActive: true,
    isEmailVerified: true,
  };

  const student: TestUser = {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'student@eduverse.et',
    role: Role.STUDENT,
    fullName: 'Chala Student',
    isActive: true,
    isEmailVerified: true,
  };

  const independentInstructor: TestUser = {
    id: '00000000-0000-4000-8000-000000000005',
    email: 'instructor@gmail.com',
    role: Role.INDEPENDENT_INSTRUCTOR,
    fullName: 'Sara Independent',
    isActive: true,
    isEmailVerified: true,
  };

  const suspendedUser: TestUser = {
    id: '00000000-0000-4000-8000-000000000006',
    email: 'suspended@eduverse.et',
    role: Role.STUDENT,
    fullName: 'Suspended Violator',
    isActive: false, // Inactive account
    isEmailVerified: true,
  };

  const targetUser: TestUser = {
    id: '00000000-0000-4000-8000-000000000099',
    email: 'target.user@eduverse.et',
    role: Role.STUDENT,
    fullName: 'Target Student',
    isActive: true,
    isEmailVerified: true,
  };

  // JWT Helper for Bearer Auth
  const getAuthHeader = (user: TestUser) => {
    const token = jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, fullName: user.fullName },
      { secret: 'dev_access_secret_key_eduverse_32chars_min', expiresIn: '15m' },
    );
    return `Bearer ${token}`;
  };

  beforeAll(async () => {
    mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      checkHealth: jest.fn().mockResolvedValue({ isHealthy: true }),
      user: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          const allUsers = [
            superAdmin,
            institutionAdmin,
            teacher,
            student,
            independentInstructor,
            suspendedUser,
            targetUser,
          ];
          const found = allUsers.find(
            (u) => u.id === where.id || u.email === where.email,
          );
          if (!found) return null;
          return {
            ...found,
            createdAt: new Date(),
            profile: {
              bio: 'Sample educational bio',
              avatarUrl: 'https://cdn.eduverse.et/avatar.png',
              phoneNumber: '+251911223344',
              timezone: 'Africa/Addis_Ababa',
            },
            institutionMemberships:
              found.role === Role.INSTITUTION_ADMIN
                ? [
                    {
                      institutionId: 'inst-aau-uuid',
                      institution: {
                        id: 'inst-aau-uuid',
                        name: 'Addis Ababa University',
                        slug: 'aau',
                      },
                    },
                  ]
                : [],
          };
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: student.id, email: student.email, fullName: student.fullName, role: Role.STUDENT, isActive: true },
        ]),
        create: jest.fn(),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          return {
            id: where.id,
            email: targetUser.email,
            fullName: targetUser.fullName,
            role: data.role || targetUser.role,
            isActive: data.isActive !== undefined ? data.isActive : targetUser.isActive,
          };
        }),
      },
      userProfile: {
        upsert: jest.fn().mockResolvedValue({
          userId: student.id,
          bio: 'Updated bio by student',
          avatarUrl: 'https://cdn.eduverse.et/new-avatar.jpg',
        }),
      },
      institutionMember: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.userId === institutionAdmin.id) {
            return {
              id: 'member-1',
              institutionId: 'inst-aau-uuid',
              userId: institutionAdmin.id,
              role: Role.INSTITUTION_ADMIN,
            };
          }
          return null;
        }),
        create: jest.fn().mockResolvedValue({}),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      invitation: {
        create: jest.fn().mockResolvedValue({
          id: 'invitation-uuid-1',
          email: 'newfaculty@aau.edu.et',
          role: Role.TEACHER,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    mockMail = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(MailService)
      .useValue(mockMail)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    jwtService = app.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // 1. AUTHENTICATION & STATUS BOUNDARIES (GET /api/v1/users/profile)
  // =========================================================================
  describe('Profile Access & Suspension Boundaries', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });

    it('should immediately block suspended user with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', getAuthHeader(suspendedUser))
        .expect(401);
    });

    it('should allow active STUDENT to access own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', getAuthHeader(student))
        .expect(200);

      expect(res.body.id).toBe(student.id);
      expect(res.body.role).toBe(Role.STUDENT);
    });

    it('should allow active TEACHER to access own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', getAuthHeader(teacher))
        .expect(200);

      expect(res.body.id).toBe(teacher.id);
      expect(res.body.role).toBe(Role.TEACHER);
    });

    it('should allow active INDEPENDENT_INSTRUCTOR to access own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', getAuthHeader(independentInstructor))
        .expect(200);

      expect(res.body.id).toBe(independentInstructor.id);
      expect(res.body.role).toBe(Role.INDEPENDENT_INSTRUCTOR);
    });

    it('should allow active STUDENT to update personal profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set('Authorization', getAuthHeader(student))
        .send({
          fullName: 'Chala Student Updated',
          bio: 'Updated bio by student',
          avatarUrl: 'https://cdn.eduverse.et/new-avatar.jpg',
        })
        .expect(200);

      expect(res.body.bio).toBe('Updated bio by student');
    });
  });

  // =========================================================================
  // 2. DIRECTORY LISTING PERMISSION MATRIX (GET /api/v1/users)
  // =========================================================================
  describe('Directory Listing Permissions (GET /api/v1/users)', () => {
    it('SUPER_ADMIN is allowed to list users (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', getAuthHeader(superAdmin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('INSTITUTION_ADMIN is allowed to list users for their tenant (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', getAuthHeader(institutionAdmin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('TEACHER is forbidden from listing users (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', getAuthHeader(teacher))
        .expect(403);
    });

    it('STUDENT is forbidden from listing users (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', getAuthHeader(student))
        .expect(403);
    });

    it('INDEPENDENT_INSTRUCTOR is forbidden from listing users (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', getAuthHeader(independentInstructor))
        .expect(403);
    });
  });

  // =========================================================================
  // 3. ROLE ASSIGNMENT & ELEVATION MATRIX (PATCH /api/v1/users/:id/role)
  // =========================================================================
  describe('Role Assignment & Escalation Guard (PATCH /api/v1/users/:id/role)', () => {
    it('SUPER_ADMIN is allowed to elevate user to TEACHER (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set('Authorization', getAuthHeader(superAdmin))
        .send({ role: Role.TEACHER })
        .expect(200);

      expect(res.body.role).toBe(Role.TEACHER);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_ROLE_ASSIGNED',
            entityId: targetUser.id,
          }),
        }),
      );
    });

    it('INSTITUTION_ADMIN is forbidden from changing system roles (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set('Authorization', getAuthHeader(institutionAdmin))
        .send({ role: Role.TEACHER })
        .expect(403);
    });

    it('TEACHER is forbidden from changing roles (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set('Authorization', getAuthHeader(teacher))
        .send({ role: Role.TEACHER })
        .expect(403);
    });

    it('STUDENT cannot elevate themselves or others (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${student.id}/role`)
        .set('Authorization', getAuthHeader(student))
        .send({ role: Role.SUPER_ADMIN })
        .expect(403);
    });

    it('INDEPENDENT_INSTRUCTOR is forbidden from changing roles (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set('Authorization', getAuthHeader(independentInstructor))
        .send({ role: Role.TEACHER })
        .expect(403);
    });
  });

  // =========================================================================
  // 4. ACCOUNT SUSPENSION MATRIX (PATCH /api/v1/users/:id/status)
  // =========================================================================
  describe('Account Suspension Guard (PATCH /api/v1/users/:id/status)', () => {
    it('SUPER_ADMIN is allowed to suspend user (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/status`)
        .set('Authorization', getAuthHeader(superAdmin))
        .send({ isActive: false, reason: 'Plagiarism detected' })
        .expect(200);

      expect(res.body.isActive).toBe(false);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: targetUser.id },
        data: { isRevoked: true },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_ACCOUNT_SUSPENDED',
            entityId: targetUser.id,
          }),
        }),
      );
    });

    it('INSTITUTION_ADMIN is forbidden from suspending global accounts (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/status`)
        .set('Authorization', getAuthHeader(institutionAdmin))
        .send({ isActive: false })
        .expect(403);
    });

    it('TEACHER is forbidden from suspending users (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/status`)
        .set('Authorization', getAuthHeader(teacher))
        .send({ isActive: false })
        .expect(403);
    });

    it('STUDENT is forbidden from suspending users (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetUser.id}/status`)
        .set('Authorization', getAuthHeader(student))
        .send({ isActive: false })
        .expect(403);
    });
  });

  // =========================================================================
  // 5. INVITATION WORKFLOW PERMISSIONS (POST /api/v1/users/invitations)
  // =========================================================================
  describe('Faculty & Member Invitation Permissions', () => {
    it('SUPER_ADMIN can invite faculty (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/invitations')
        .set('Authorization', getAuthHeader(superAdmin))
        .send({
          email: 'prof.smith@eduverse.et',
          role: Role.TEACHER,
        })
        .expect(201);

      expect(res.body).toHaveProperty('invitationId');
    });

    it('INSTITUTION_ADMIN can invite faculty for their institution (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/invitations')
        .set('Authorization', getAuthHeader(institutionAdmin))
        .send({
          email: 'dean.aau@eduverse.et',
          role: Role.TEACHER,
        })
        .expect(201);

      expect(res.body).toHaveProperty('invitationId');
    });

    it('INSTITUTION_ADMIN cannot invite a SUPER_ADMIN (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/invitations')
        .set('Authorization', getAuthHeader(institutionAdmin))
        .send({
          email: 'fakeadmin@eduverse.et',
          role: Role.SUPER_ADMIN,
        })
        .expect(403);
    });

    it('TEACHER is forbidden from inviting members (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/invitations')
        .set('Authorization', getAuthHeader(teacher))
        .send({
          email: 'colleague@eduverse.et',
          role: Role.TEACHER,
        })
        .expect(403);
    });

    it('STUDENT is forbidden from inviting members (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/invitations')
        .set('Authorization', getAuthHeader(student))
        .send({
          email: 'friend@eduverse.et',
          role: Role.STUDENT,
        })
        .expect(403);
    });
  });

  // =========================================================================
  // 6. ACCEPT INVITATION (POST /api/v1/users/invitations/accept)
  // =========================================================================
  describe('Public Invitation Acceptance (POST /api/v1/users/invitations/accept)', () => {
    it('should reject invalid or non-existent invitation token with 400 Bad Request', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/invitations/accept')
        .send({
          token: 'invalid-nonexistent-token',
          fullName: 'New Member',
          password: 'SecurePassword123!',
        })
        .expect(400);

      expect(res.body.message).toContain('Invalid or expired invitation token');
    });

    it('should accept valid invitation and activate account (200 OK)', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'invitation-uuid-1',
        email: 'accepted.teacher@aau.edu.et',
        role: Role.TEACHER,
        institutionId: 'inst-aau-uuid',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
      });

      mockPrisma.user.create.mockResolvedValue({
        id: 'newly-created-teacher-uuid',
        email: 'accepted.teacher@aau.edu.et',
        fullName: 'Dr. Newly Created',
        role: Role.TEACHER,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/invitations/accept')
        .send({
          token: 'valid-invitation-token',
          fullName: 'Dr. Newly Created',
          password: 'StrongPassword123!',
        })
        .expect(200);

      expect(res.body.message).toContain('Invitation accepted and account activated successfully');
      expect(res.body.user.role).toBe(Role.TEACHER);
    });
  });
});
