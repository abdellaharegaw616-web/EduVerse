import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { LessonsService } from '../lessons/lessons.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { CertificatesService } from '../certificates/certificates.service';
import { PrismaService, CourseStatus } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('Pedagogical Learning Pipeline (End-to-End Cycle)', () => {
  let enrollmentsService: EnrollmentsService;
  let lessonsService: LessonsService;
  let assessmentsService: AssessmentsService;
  let assignmentsService: AssignmentsService;
  let certificatesService: CertificatesService;
  let prisma: any;
  let mailService: any;
  let notificationsService: any;

  const studentId = 'student-uuid-42';
  const teacherId = 'teacher-uuid-99';
  const courseId = 'course-fullstack-dev';
  const lessonId = 'lesson-react-deep-dive';
  const quizId = 'quiz-state-management';
  const assignmentId = 'assignment-portfolio-project';

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      course: {
        findUnique: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      lesson: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
      lessonProgress: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
      },
      quiz: {
        findUnique: jest.fn(),
      },
      quizAttempt: {
        count: jest.fn(),
        create: jest.fn(),
      },
      assignment: {
        findUnique: jest.fn(),
      },
      assignmentSubmission: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      certificate: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendCertificateIssued: jest.fn().mockResolvedValue(undefined),
    };

    notificationsService = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      notify: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        LessonsService,
        AssessmentsService,
        AssignmentsService,
        CertificatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    enrollmentsService = module.get<EnrollmentsService>(EnrollmentsService);
    lessonsService = module.get<LessonsService>(LessonsService);
    assessmentsService = module.get<AssessmentsService>(AssessmentsService);
    assignmentsService = module.get<AssignmentsService>(AssignmentsService);
    certificatesService = module.get<CertificatesService>(CertificatesService);
  });

  describe('Pedagogical Step 1: Course Enrollment', () => {
    it('should successfully enroll student into published course with 0% initial progress', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: true,
        fullName: 'Dawit Abebe',
      });

      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        title: 'Full Stack Engineering',
        status: CourseStatus.PUBLISHED,
        authorId: teacherId,
      });

      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue({
        id: 'enr-1',
        userId: studentId,
        courseId,
        progressPercentage: 0,
        completedAt: null,
      });

      const enrollment = await enrollmentsService.enrollInCourse(studentId, courseId);

      expect(enrollment.enrollment.id).toBe('enr-1');
      expect(enrollment.enrollment.courseId).toBe(courseId);
      expect(enrollment.enrollment.progressPercentage).toBe(0);
      expect(prisma.enrollment.create).toHaveBeenCalled();
    });
  });

  describe('Pedagogical Step 2: Lesson Progression & Completion Tracking', () => {
    it('should mark lesson completed, update progress record and recalculate percentage', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: true,
      });

      prisma.lesson.findUnique.mockResolvedValue({
        id: lessonId,
        title: 'React Architecture',
        section: {
          courseId,
          course: {
            id: courseId,
            status: CourseStatus.PUBLISHED,
            sections: [
              {
                lessons: [{ id: lessonId }, { id: 'lesson-2' }],
              },
            ],
          },
        },
      });

      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: studentId,
        courseId,
        progressPercentage: 0,
      });

      prisma.lessonProgress.upsert.mockResolvedValue({
        id: 'lp-1',
        userId: studentId,
        lessonId,
        isCompleted: true,
      });

      // 1 out of 2 lessons completed = 50%
      prisma.lessonProgress.count.mockResolvedValue(1);
      prisma.enrollment.update.mockResolvedValue({
        id: 'enr-1',
        progressPercentage: 50,
      });

      const result = await lessonsService.completeLesson(studentId, lessonId);

      expect(result.completed).toBe(true);
      expect(result.progressPercentage).toBe(50);
      expect(prisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ progressPercentage: 50 }),
        }),
      );
    });
  });

  describe('Pedagogical Step 3: Quiz Assessment & Score Calculation', () => {
    it('should grade quiz submission, determine passed status, and persist attempt record', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: true,
      });

      prisma.quiz.findUnique.mockResolvedValue({
        id: quizId,
        passingScore: 70,
        attemptLimit: 3,
        lesson: {
          section: {
            courseId,
            course: { id: courseId },
          },
        },
        questions: [
          {
            id: 'q1',
            type: 'MULTIPLE_CHOICE',
            points: 50,
            options: [
              { id: 'opt-correct-1', isCorrect: true },
              { id: 'opt-wrong-1', isCorrect: false },
            ],
          },
          {
            id: 'q2',
            type: 'MULTIPLE_CHOICE',
            points: 50,
            options: [
              { id: 'opt-correct-2', isCorrect: true },
              { id: 'opt-wrong-2', isCorrect: false },
            ],
          },
        ],
      });

      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: studentId,
        courseId,
      });

      prisma.quizAttempt.count.mockResolvedValue(0); // 0 prior attempts
      prisma.quizAttempt.create.mockResolvedValue({
        id: 'attempt-1',
        userId: studentId,
        quizId,
        score: 100,
        passed: true,
      });

      const result = await assessmentsService.submitQuiz(studentId, quizId, {
        answers: [
          { questionId: 'q1', selectedOptionId: 'opt-correct-1' },
          { questionId: 'q2', selectedOptionId: 'opt-correct-2' },
        ],
      });

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.earnedPoints).toBe(100);
      expect(result.totalPoints).toBe(100);
    });
  });

  describe('Pedagogical Step 4: Assignment Submission & Instructor Evaluation', () => {
    it('should submit student assignment into PENDING evaluation queue', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: true,
      });

      prisma.assignment.findUnique.mockResolvedValue({
        id: assignmentId,
        lesson: {
          section: {
            courseId,
            course: { id: courseId },
          },
        },
      });

      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: studentId,
        courseId,
      });

      prisma.assignmentSubmission.findFirst.mockResolvedValue(null);
      prisma.assignmentSubmission.create.mockResolvedValue({
        id: 'sub-1',
        userId: studentId,
        assignmentId,
        content: 'https://github.com/student/my-portfolio',
        status: 'PENDING',
      });

      const submission = await assignmentsService.submitAssignment(studentId, assignmentId, {
        content: 'https://github.com/student/my-portfolio',
      });

      expect(submission.id).toBe('sub-1');
      expect(submission.status).toBe('PENDING');
      expect(prisma.assignmentSubmission.create).toHaveBeenCalled();
    });

    it('should grade submission with feedback and mark status as GRADED', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        assignmentId,
        userId: studentId,
        status: 'PENDING',
        assignment: {
          maxScore: 100,
          lesson: {
            section: {
              course: {
                id: courseId,
                authorId: teacherId,
              },
            },
          },
        },
      });

      prisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        isActive: true,
      });

      prisma.assignmentSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'GRADED',
        grade: 95,
        feedback: 'Outstanding architectural structure and clean documentation.',
        gradedAt: new Date(),
        gradedById: teacherId,
      });

      const graded = await assignmentsService.gradeSubmission(
        teacherId,
        'sub-1',
        {
          grade: 95,
          feedback: 'Outstanding architectural structure and clean documentation.',
        },
      );

      expect(graded.status).toBe('GRADED');
      expect(graded.grade).toBe(95);
      expect(prisma.assignmentSubmission.update).toHaveBeenCalled();
    });
  });

  describe('Pedagogical Step 5: Certificate Claiming & Public Verification', () => {
    it('should verify 100% course completion and issue cryptographic certificate', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentId,
        isActive: true,
        fullName: 'Dawit Abebe',
        email: 'dawit@eduverse.et',
      });

      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        title: 'Full Stack Engineering',
        author: { fullName: 'Dr. Bikila' },
        institution: { name: 'Addis Ababa University', slug: 'aau' },
      });

      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: studentId,
        courseId,
        progressPercentage: 100,
        completedAt: new Date(),
        certificate: null,
        course: {
          id: courseId,
          title: 'Full Stack Engineering',
          author: { fullName: 'Dr. Bikila' },
          institution: { name: 'Addis Ababa University', slug: 'aau' },
        },
      });

      prisma.certificate.create.mockImplementation((args: any) => ({
        id: 'cert-1',
        ...args.data,
      }));

      const cert = await certificatesService.claimCertificate(studentId, courseId);

      expect(cert.certificate.id).toBe('cert-1');
      expect(cert.certificate.verificationCode).toMatch(/^EV-\d{4}-[A-Z0-9]{16}$/);
      expect(prisma.certificate.create).toHaveBeenCalled();
    });

    it('should publicly verify authenticity of valid certificate by verification code', async () => {
      const mockCode = 'EV-2026-ABCD-1234';

      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert-1',
        verificationCode: mockCode,
        isRevoked: false,
        issuedAt: new Date('2026-03-01T10:00:00Z'),
        user: {
          id: studentId,
          fullName: 'Dawit Abebe',
          email: 'dawit@eduverse.et',
        },
        enrollment: {
          completedAt: new Date('2026-03-01T09:30:00Z'),
        },
        course: {
          id: courseId,
          title: 'Full Stack Engineering',
          author: { fullName: 'Dr. Bikila' },
          institution: { name: 'Addis Ababa University', slug: 'aau' },
        },
      });

      const verification = await certificatesService.verifyPublic(mockCode);

      expect(verification.isValid).toBe(true);
      expect(verification.certificate?.studentName).toBe('Dawit Abebe');
      expect(verification.certificate?.courseTitle).toBe('Full Stack Engineering');
      expect(verification.certificate?.verificationCode).toBe(mockCode);
    });
  });
});
