import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService, Role } from '../src/database/prisma.service';
import { MailService } from '../src/mail/mail.service';
import * as argon2 from 'argon2';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let mockMail: any;

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'test.student@eduverse.et',
    fullName: 'Test Student',
    role: Role.STUDENT,
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    passwordHash: '',
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('CorrectPassword123!', { type: argon2.argon2id });

    mockPrisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      checkHealth: jest.fn().mockResolvedValue({ isHealthy: true }),
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      emailVerificationToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      passwordResetToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
      },
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a student account successfully', async () => {
      const { passwordHash: _hash, ...sanitizedUser } = mockUser;
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(sanitizedUser);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test.student@eduverse.et',
          fullName: 'Test Student',
          password: 'StrongPassword123!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test.student@eduverse.et');
      expect(response.body.user.role).toBe('STUDENT');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration when email already exists (409 Conflict)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test.student@eduverse.et',
          fullName: 'Duplicate Student',
          password: 'StrongPassword123!',
        })
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user and set secure HttpOnly cookies', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test.student@eduverse.et',
          password: 'CorrectPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('passwordHash');

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('access_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('refresh_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('should reject invalid password with 401 Unauthorized', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test.student@eduverse.et',
          password: 'WrongPassword999!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear cookies on logout', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(200);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      // Verifies cookie expiration set in past
      expect(cookies.some((c) => c.includes('access_token=;'))).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });
});

