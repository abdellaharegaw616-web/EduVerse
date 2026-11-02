import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';

import { AppModule } from '../src/app.module';
import { PrismaService, Role, CourseStatus } from '../src/database/prisma.service';
import { MailService } from '../src/mail/mail.service';

describe('Teacher Studio & Course Ownership Matrix (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: any;
  let mockMail: any;

  const teacherA = {
    id: '33333333-3333-4000-8000-333333333333',
    email: 'teacher.a@aau.edu.et',
    role: Role.TEACHER,
    fullName: 'Dr. Abebe A',
    isActive: true,
    isEmailVerified: true,
  };

  const teacherB = {
    id: '44444444-4444-4000-8000-444444444444',
    email: 'teacher.b@aau.edu.et',
    role: Role.TEACHER,
    fullName: 'Dr. Bekele B',
    isActive: true,
    isEmailVerified: true,
  };

  const studentUser = {
    id: '55555555-5555-4000-8000-555555555555',
    email: 'student@eduverse.et',
    role: Role.STUDENT,
    fullName: 'Chala Student',
    isActive: true,
    isEmailVerified: true,
  };

  let teacherAToken: string;
  let teacherBToken: string;
  let studentToken: string;

  beforeAll(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === teacherA.id) return Promise.resolve(teacherA);
          if (where.id === teacherB.id) return Promise.resolve(teacherB);
          if (where.id === studentUser.id) return Promise.resolve(studentUser);
          return Promise.resolve(null);
        }),
      },
      course: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      courseSection: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      lesson: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      quiz: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      question: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      assignment: {
        upsert: jest.fn(),
      },
      assignmentSubmission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      enrollment: {
        findMany: jest.fn(),
      },
      quizAttempt: {
        findMany: jest.fn(),
      },
      courseCategory: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
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

    teacherAToken = jwtService.sign({
      sub: teacherA.id,
      email: teacherA.email,
      role: teacherA.role,
    });

    teacherBToken = jwtService.sign({
      sub: teacherB.id,
      email: teacherB.email,
      role: teacherB.role,
    });

    studentToken = jwtService.sign({
      sub: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Role Authorization Guard for Teacher Endpoints', () => {
    it('strictly forbids STUDENT from accessing Teacher Dashboard (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/courses/teacher/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('allows TEACHER to access Teacher Dashboard (200 OK)', async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockPrisma.assignmentSubmission.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/courses/teacher/dashboard')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .expect(200);

      expect(res.body.stats.totalCourses).toBe(0);
    });
  });

  describe('Course Creation & Cross-Teacher Ownership Protection', () => {
    const courseId = '33333333-3333-4000-8000-000000000001';

    it('allows Teacher A to create a new draft course', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.course.create.mockResolvedValue({
        id: courseId,
        title: 'Network Systems',
        slug: 'network-systems',
        description: 'Deep dive into computer networking',
        status: CourseStatus.DRAFT,
        authorId: teacherA.id,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/courses/teacher')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          title: 'Network Systems',
          description: 'Deep dive into computer networking and TCP/IP',
        })
        .expect(201);

      expect(res.body.title).toBe('Network Systems');
      expect(mockPrisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: teacherA.id,
            status: CourseStatus.DRAFT,
          }),
        }),
      );
    });

    it('forbids Teacher B from editing Teacher A course (403 Forbidden)', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: courseId,
        title: 'Network Systems',
        authorId: teacherA.id,
        sections: [],
        _count: { enrollments: 0 },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/courses/teacher/${courseId}`)
        .set('Authorization', `Bearer ${teacherBToken}`)
        .send({ title: 'Hijacked Network Systems' })
        .expect(403);
    });

    it('forbids Teacher B from deleting Teacher A course (403 Forbidden)', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: courseId,
        title: 'Network Systems',
        authorId: teacherA.id,
        sections: [],
        _count: { enrollments: 0 },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/courses/teacher/${courseId}`)
        .set('Authorization', `Bearer ${teacherBToken}`)
        .expect(403);
    });
  });

  describe('Grading Student Submissions', () => {
    it('allows Teacher A to grade a student submission in their course', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        assignmentId: 'assign-1',
        assignment: {
          maxScore: 100,
          lesson: {
            section: { course: { authorId: teacherA.id } },
          },
        },
      });

      mockPrisma.assignmentSubmission.update.mockResolvedValue({
        id: 'sub-1',
        grade: 96,
        status: 'GRADED',
      });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/courses/teacher/assignments/submissions/33333333-3333-4000-8000-333333333333/grade')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ grade: 96, feedback: 'Great performance' })
        .expect(200);

      expect(res.body.grade).toBe(96);
    });
  });
});
