import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';

import { AppModule } from '../src/app.module';
import { PrismaService, Role } from '../src/database/prisma.service';
import { MailService } from '../src/mail/mail.service';

describe('Student Portal & Multi-Account Isolation (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: any;
  let mockMail: any;

  const studentOne = {
    id: '11111111-1111-4000-8000-111111111111',
    email: 'student1@eduverse.et',
    role: Role.STUDENT,
    fullName: 'Almaz Kebede',
    isActive: true,
    isEmailVerified: true,
  };

  const studentTwo = {
    id: '22222222-2222-4000-8000-222222222222',
    email: 'student2@eduverse.et',
    role: Role.STUDENT,
    fullName: 'Dawit Bekele',
    isActive: true,
    isEmailVerified: true,
  };

  let studentOneToken: string;
  let studentTwoToken: string;

  beforeAll(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === studentOne.id || where.email === studentOne.email) {
            return Promise.resolve({
              ...studentOne,
              createdAt: new Date(),
              profile: {
                bio: 'CS Student at AAU',
                avatarUrl: 'https://images.eduverse.et/avatar.jpg',
                phoneNumber: '+251911223344',
                timezone: 'Africa/Addis_Ababa',
              },
              institutionMemberships: [],
            });
          }
          if (where.id === studentTwo.id || where.email === studentTwo.email) {
            return Promise.resolve({
              ...studentTwo,
              createdAt: new Date(),
              profile: null,
              institutionMemberships: [],
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn(),
      },
      userProfile: {
        upsert: jest.fn(),
      },
      enrollment: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      lessonProgress: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      assignment: {
        findMany: jest.fn(),
      },
      quizAttempt: {
        findMany: jest.fn(),
      },
      certificate: {
        findMany: jest.fn(),
      },
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockMail = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
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
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Issue tokens for both student accounts
    studentOneToken = jwtService.sign({
      sub: studentOne.id,
      email: studentOne.email,
      role: studentOne.role,
    });

    studentTwoToken = jwtService.sign({
      sub: studentTwo.id,
      email: studentTwo.email,
      role: studentTwo.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/enrollments/my/dashboard', () => {
    it('returns aggregated metrics for active Student 1', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([
        {
          id: 'enr-1',
          userId: studentOne.id,
          courseId: 'c-1',
          progressPercentage: 75,
          completedAt: null,
          course: {
            title: 'TypeScript Masterclass',
            slug: 'typescript-masterclass',
            author: { fullName: 'Dr. Abebe' },
            institution: { name: 'AAU', slug: 'aau' },
            category: { name: 'Software' },
            sections: [],
          },
        },
      ]);
      mockPrisma.lessonProgress.findMany.mockResolvedValue([]);
      mockPrisma.assignment.findMany.mockResolvedValue([]);
      mockPrisma.quizAttempt.findMany.mockResolvedValue([]);
      mockPrisma.certificate.findMany.mockResolvedValue([]);

      const resOne = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my/dashboard')
        .set('Authorization', `Bearer ${studentOneToken}`)
        .expect(200);

      expect(resOne.body.stats.enrolledCount).toBe(1);
      expect(resOne.body.stats.averageProgress).toBe(75);
      expect(resOne.body.recentEnrollments[0].course.title).toBe('TypeScript Masterclass');
    });

    it('returns zero statistics and empty arrays for fresh Student 2 (no enrollments)', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockPrisma.lessonProgress.findMany.mockResolvedValue([]);
      mockPrisma.assignment.findMany.mockResolvedValue([]);
      mockPrisma.quizAttempt.findMany.mockResolvedValue([]);
      mockPrisma.certificate.findMany.mockResolvedValue([]);

      const resTwo = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my/dashboard')
        .set('Authorization', `Bearer ${studentTwoToken}`)
        .expect(200);

      expect(resTwo.body.stats.enrolledCount).toBe(0);
      expect(resTwo.body.stats.completedCount).toBe(0);
      expect(resTwo.body.stats.averageProgress).toBe(0);
      expect(resTwo.body.stats.certificatesCount).toBe(0);
      expect(resTwo.body.recentEnrollments).toHaveLength(0);
    });
  });

  describe('GET /api/v1/certificates/my', () => {
    it('returns certificates earned strictly by Student 1', async () => {
      mockPrisma.certificate.findMany.mockImplementation((args: any) => {
        if (args?.where?.userId === studentOne.id) {
          return Promise.resolve([
            {
              id: 'cert-1',
              verificationCode: 'EV-AAU-2026-0001',
              issuedAt: new Date(),
              course: {
                id: 'course-1',
                title: 'Full-Stack Distributed Systems',
                slug: 'fullstack-distributed-systems',
                institution: { name: 'AAU', slug: 'aau' },
              },
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const resStudentOne = await request(app.getHttpServer())
        .get('/api/v1/certificates/my')
        .set('Authorization', `Bearer ${studentOneToken}`)
        .expect(200);

      expect(resStudentOne.body).toHaveLength(1);
      expect(resStudentOne.body[0].verificationCode).toBe('EV-AAU-2026-0001');

      const resStudentTwo = await request(app.getHttpServer())
        .get('/api/v1/certificates/my')
        .set('Authorization', `Bearer ${studentTwoToken}`)
        .expect(200);

      expect(resStudentTwo.body).toHaveLength(0);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read - Ownership Protection', () => {
    it('prevents Student 2 from marking Student 1 notification as read (404 NotFound)', async () => {
      mockPrisma.notification.findFirst.mockImplementation((args: any) => {
        // notification belongs to studentOne
        if (args?.where?.id === 'notif-student-1' && args?.where?.userId === studentOne.id) {
          return Promise.resolve({ id: 'notif-student-1', userId: studentOne.id });
        }
        return Promise.resolve(null);
      });

      await request(app.getHttpServer())
        .patch('/api/v1/notifications/11111111-1111-4000-8000-111111111111/read')
        .set('Authorization', `Bearer ${studentTwoToken}`)
        .expect(404);
    });
  });

  describe('GET & PATCH /api/v1/users/profile', () => {
    it('returns student profile data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: studentOne.id,
        email: studentOne.email,
        fullName: studentOne.fullName,
        role: studentOne.role,
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        profile: {
          bio: 'CS Student at AAU',
          avatarUrl: 'https://images.eduverse.et/avatar.jpg',
          phoneNumber: '+251911223344',
          timezone: 'Africa/Addis_Ababa',
        },
        institutionMemberships: [],
      });

      const resProfile = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${studentOneToken}`)
        .expect(200);

      expect(resProfile.body.email).toBe(studentOne.email);
      expect(resProfile.body.fullName).toBe('Almaz Kebede');
      expect(resProfile.body.profile.bio).toBe('CS Student at AAU');
    });

    it('allows student to update personal profile', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: studentOne.id,
        fullName: 'Almaz Kebede Updated',
      });
      mockPrisma.userProfile.upsert.mockResolvedValue({
        userId: studentOne.id,
        bio: 'Updated bio statement',
      });

      await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${studentOneToken}`)
        .send({
          fullName: 'Almaz Kebede Updated',
          bio: 'Updated bio statement',
        })
        .expect(200);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: studentOne.id },
          data: { fullName: 'Almaz Kebede Updated' },
        }),
      );
    });
  });
});
