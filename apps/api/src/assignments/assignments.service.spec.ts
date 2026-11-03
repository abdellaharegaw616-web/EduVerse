import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { PrismaService } from '../database/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('AssignmentsService (Phase 8E: Assignment Management)', () => {
  let service: AssignmentsService;
  let prisma: any;

  const mockActiveStudent = {
    id: 'student-1',
    email: 'student@eduverse.et',
    fullName: 'Yonas Mamo',
    isActive: true,
    role: 'STUDENT',
  };

  const mockTeacher = {
    id: 'teacher-1',
    email: 'teacher@eduverse.et',
    fullName: 'Dr. Dawit Bekele',
    isActive: true,
    role: 'TEACHER',
  };

  const mockOtherTeacher = {
    id: 'teacher-other',
    email: 'stranger@eduverse.et',
    fullName: 'Unknown Instructor',
    isActive: true,
    role: 'TEACHER',
  };

  const mockCourse = {
    id: 'course-1',
    title: 'Cloud Architecture & DevOps',
    slug: 'cloud-architecture-devops',
    authorId: 'teacher-1',
  };

  const mockAssignment = {
    id: 'assignment-1',
    lessonId: 'lesson-1',
    title: 'Enterprise VPC Design Spec',
    instructions: 'Submit your architectural diagram in PDF format along with CIDR justifications.',
    maxScore: 100,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
    lesson: {
      id: 'lesson-1',
      title: 'VPC Architecture',
      section: {
        id: 'sec-1',
        courseId: 'course-1',
        course: mockCourse,
      },
    },
    submissions: [],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      assignment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      assignmentSubmission: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  describe('1. Student Assignment Submission Workflow', () => {
    it('should successfully submit valid work with written content and PDF attachment', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
      prisma.assignmentSubmission.findFirst.mockResolvedValue(null); // No previous submission

      const mockCreated = {
        id: 'sub-1',
        assignmentId: 'assignment-1',
        userId: 'student-1',
        content: 'Completed VPC diagram architecture with 3 private subnets.',
        fileUrl: 'https://cdn.eduverse.et/submissions/vpc_design.pdf',
        status: 'PENDING',
        submittedAt: new Date(),
      };
      prisma.assignmentSubmission.create.mockResolvedValue(mockCreated);

      const dto = {
        content: 'Completed VPC diagram architecture with 3 private subnets.',
        fileUrl: 'https://cdn.eduverse.et/submissions/vpc_design.pdf',
        fileName: 'vpc_design.pdf',
        fileSize: 1048576, // 1MB
      };

      const result = await service.submitAssignment('student-1', 'assignment-1', dto);

      expect(result).toBeDefined();
      expect(result.id).toBe('sub-1');
      expect(result.status).toBe('PENDING');
      expect(prisma.assignmentSubmission.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'ASSIGNMENT_SUBMITTED' }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'teacher-1' }),
        }),
      );
    });

    it('should reject late submission when deadline has passed (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      const expiredAssignment = {
        ...mockAssignment,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };
      prisma.assignment.findUnique.mockResolvedValue(expiredAssignment);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const dto = {
        content: 'My late submission attempt.',
      };

      await expect(
        service.submitAssignment('student-1', 'assignment-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file upload with dangerous/invalid file extension (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const dto = {
        content: 'Here is my submission script.',
        fileUrl: 'https://cdn.eduverse.et/hacks/payload.exe',
        fileName: 'payload.exe',
      };

      await expect(
        service.submitAssignment('student-1', 'assignment-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file upload exceeding maximum size limit of 25MB (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });

      const dto = {
        content: 'Heavy zip archive.',
        fileUrl: 'https://cdn.eduverse.et/large_dataset.zip',
        fileName: 'large_dataset.zip',
        fileSize: 30 * 1024 * 1024, // 30MB (> 25MB limit)
      };

      await expect(
        service.submitAssignment('student-1', 'assignment-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submission if student is not enrolled in course (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.assignment.findUnique.mockResolvedValue(mockAssignment);
      prisma.enrollment.findUnique.mockResolvedValue(null); // Not enrolled

      await expect(
        service.submitAssignment('student-1', 'assignment-1', { content: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if assignment does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.assignment.findUnique.mockResolvedValue(null);

      await expect(
        service.getAssignmentDetails('student-1', 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Submission Ownership & Access Authorization', () => {
    it('should reject cross-user access to another student submission (403 Forbidden)', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'student-1', // Belongs to student-1
        assignment: mockAssignment,
        user: mockActiveStudent,
      });

      // Student-2 tries to inspect Student-1's submission
      await expect(
        service.getSubmissionDetails('student-2', 'sub-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow student owner to view their submission and feedback', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'student-1',
        content: 'Student solution text',
        fileUrl: 'https://cdn.eduverse.et/doc.pdf',
        grade: 92,
        feedback: 'Great CIDR subnet design!',
        status: 'GRADED',
        submittedAt: new Date(),
        gradedAt: new Date(),
        assignment: mockAssignment,
        user: mockActiveStudent,
      });

      const result = await service.getSubmissionDetails('student-1', 'sub-1', false);

      expect(result).toBeDefined();
      expect(result.id).toBe('sub-1');
      expect(result.grade).toBe(92);
      expect(result.feedback).toBe('Great CIDR subnet design!');
      expect(result.status).toBe('GRADED');
    });

    it('should allow authorized course instructor to view student submission', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'student-1',
        content: 'Student solution text',
        status: 'PENDING',
        assignment: mockAssignment, // Course authorId = 'teacher-1'
        user: mockActiveStudent,
      });

      const result = await service.getSubmissionDetails('teacher-1', 'sub-1', false);
      expect(result).toBeDefined();
      expect(result.studentName).toBe('Yonas Mamo');
    });
  });

  describe('3. Teacher Grading & Feedback', () => {
    it('should allow course instructor to grade submission, set feedback, and notify student', async () => {
      prisma.user.findUnique.mockResolvedValue(mockTeacher);
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'student-1',
        assignment: mockAssignment, // maxScore = 100, authorId = 'teacher-1'
      });

      const gradedDate = new Date();
      prisma.assignmentSubmission.update.mockResolvedValue({
        id: 'sub-1',
        grade: 95,
        feedback: 'Flawless VPC isolation and routing table associations.',
        status: 'GRADED',
        gradedAt: gradedDate,
      });

      const result = await service.gradeSubmission('teacher-1', 'sub-1', {
        grade: 95,
        feedback: 'Flawless VPC isolation and routing table associations.',
      });

      expect(result.status).toBe('GRADED');
      expect(result.grade).toBe(95);
      expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grade: 95,
            status: 'GRADED',
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'ASSIGNMENT_GRADED' }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'student-1' }),
        }),
      );
    });

    it('should reject grade exceeding assignment maximum score (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockTeacher);
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'student-1',
        assignment: mockAssignment, // maxScore = 100
      });

      // Teacher attempts to award 105 / 100
      await expect(
        service.gradeSubmission('teacher-1', 'sub-1', { grade: 105 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unauthorized teacher attempting to grade another instructor course (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockOtherTeacher);
      prisma.assignmentSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'student-1',
        assignment: mockAssignment, // authorId = 'teacher-1'
      });

      // teacher-other attempts to grade
      await expect(
        service.gradeSubmission('teacher-other', 'sub-1', { grade: 80 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
