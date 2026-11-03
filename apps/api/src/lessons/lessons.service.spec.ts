import { Test, TestingModule } from '@nestjs/testing';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('LessonsService (Phase 8C: Learning Management System)', () => {
  let service: LessonsService;
  let prisma: any;

  const mockUserActiveStudent = {
    id: 'student-1',
    email: 'student@eduverse.et',
    isActive: true,
    role: 'STUDENT',
  };

  const mockUserSuspended = {
    id: 'suspended-1',
    email: 'banned@eduverse.et',
    isActive: false,
    role: 'STUDENT',
  };

  const mockCourse = {
    id: 'course-1',
    title: 'Cloud Computing with Python',
    slug: 'cloud-computing-python',
    description: 'Learn cloud computing in Addis Ababa.',
    authorId: 'teacher-1',
    thumbnailUrl: 'https://images.unsplash.com/test.jpg',
    author: {
      id: 'teacher-1',
      fullName: 'Abebe Bikila',
      profile: {
        avatarUrl: null,
      },
    },
    sections: [
      {
        id: 'sec-1',
        title: 'Introduction to Cloud',
        sortOrder: 1,
        lessons: [
          {
            id: 'lesson-1',
            title: 'Welcome to Cloud',
            slug: 'welcome-to-cloud',
            durationMinutes: 10,
            sortOrder: 1,
            type: 'VIDEO',
            isFreePreview: true,
          },
          {
            id: 'lesson-2',
            title: 'Core Architecture',
            slug: 'core-architecture',
            durationMinutes: 15,
            sortOrder: 2,
            type: 'TEXT',
            isFreePreview: false,
          },
        ],
      },
      {
        id: 'sec-2',
        title: 'Deploying Virtual Servers',
        sortOrder: 2,
        lessons: [
          {
            id: 'lesson-3',
            title: 'Server Configuration',
            slug: 'server-configuration',
            durationMinutes: 20,
            sortOrder: 1,
            type: 'VIDEO',
            isFreePreview: false,
          },
        ],
      },
    ],
  };

  const mockLesson1Full = {
    id: 'lesson-1',
    title: 'Welcome to Cloud',
    slug: 'welcome-to-cloud',
    content: 'Welcome to this foundational course on cloud computing.',
    videoUrl: 'https://cdn.eduverse.et/videos/intro.mp4',
    durationMinutes: 10,
    sortOrder: 1,
    type: 'VIDEO',
    isFreePreview: true,
    section: {
      id: 'sec-1',
      title: 'Introduction to Cloud',
      courseId: 'course-1',
      course: mockCourse,
    },
    resources: [
      {
        id: 'res-1',
        title: 'Syllabus PDF',
        fileUrl: 'https://cdn.eduverse.et/docs/syllabus.pdf',
        fileType: 'PDF',
        fileSize: 102400,
      },
    ],
    quiz: null,
    assignment: null,
  };

  const mockLesson2Full = {
    id: 'lesson-2',
    title: 'Core Architecture',
    slug: 'core-architecture',
    content: 'Deep dive into cloud nodes, VPCs, and IAM policies.',
    videoUrl: null,
    durationMinutes: 15,
    sortOrder: 2,
    type: 'TEXT',
    isFreePreview: false,
    section: {
      id: 'sec-1',
      title: 'Introduction to Cloud',
      courseId: 'course-1',
      course: mockCourse,
    },
    resources: [],
    quiz: null,
    assignment: null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      lesson: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      course: {
        findFirst: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      lessonProgress: {
        upsert: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
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
        LessonsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  describe('1. Content Authorization & Student Access', () => {
    it('should grant access to enrolled student for protected lesson (200 OK)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(mockLesson2Full);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: 'student-1',
        courseId: 'course-1',
        lessonProgress: [{ lessonId: 'lesson-2', completed: true }],
      });

      const result = await service.getLessonForStudent('student-1', 'lesson-2');

      expect(result).toBeDefined();
      expect(result.id).toBe('lesson-2');
      expect(result.title).toBe('Core Architecture');
      expect(result.type).toBe('TEXT');
      expect(result.isCompleted).toBe(true);
      expect(result.previousLesson).toBeDefined();
      expect(result.previousLesson?.id).toBe('lesson-1');
      expect(result.nextLesson).toBeDefined();
      expect(result.nextLesson?.id).toBe('lesson-3');
    });

    it('should deny access to non-enrolled student for protected lesson (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(mockLesson2Full);
      prisma.enrollment.findUnique.mockResolvedValue(null); // Not enrolled

      await expect(
        service.getLessonForStudent('student-1', 'lesson-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should grant access to free preview lesson even if student is not enrolled', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(mockLesson1Full); // isFreePreview: true
      prisma.enrollment.findUnique.mockResolvedValue(null); // Not enrolled

      const result = await service.getLessonForStudent('student-1', 'lesson-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('lesson-1');
      expect(result.isFreePreview).toBe(true);
      expect(result.resources).toHaveLength(1);
    });

    it('should deny access if student account is suspended (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserSuspended);

      await expect(
        service.getLessonForStudent('suspended-1', 'lesson-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if lesson does not exist (404 Not Found)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(null);

      await expect(
        service.getLessonForStudent('student-1', 'non-existent-lesson'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Lesson Completion & Progress Calculation', () => {
    it('should mark lesson complete, persist in PostgreSQL, and recalculate progress', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(mockLesson1Full);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: 'student-1',
        courseId: 'course-1',
        completedAt: null,
      });

      prisma.lessonProgress.upsert.mockResolvedValue({
        id: 'lp-1',
        enrollmentId: 'enr-1',
        lessonId: 'lesson-1',
        completed: true,
      });

      // Total 3 lessons in course, 1 completed
      prisma.lesson.count.mockResolvedValue(3);
      prisma.lessonProgress.count.mockResolvedValue(1);

      prisma.enrollment.update.mockResolvedValue({
        id: 'enr-1',
        progressPercentage: 33.33,
        completedAt: null,
      });

      const result = await service.completeLesson('student-1', 'lesson-1');

      expect(result.completed).toBe(true);
      expect(result.completedLessons).toBe(1);
      expect(result.totalLessons).toBe(3);
      expect(result.progressPercentage).toBe(33.33);
      expect(result.courseCompleted).toBe(false);

      expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: 'enr-1',
            lessonId: 'lesson-1',
          },
        },
        create: expect.objectContaining({ completed: true }),
        update: expect.objectContaining({ completed: true }),
      });
    });

    it('should trigger course completion, set completedAt, audit log, and notify when all lessons are finished (100%)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(mockLesson2Full);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: 'student-1',
        courseId: 'course-1',
        completedAt: null,
      });

      prisma.lessonProgress.upsert.mockResolvedValue({ id: 'lp-3' });

      // Total 3 lessons in course, all 3 completed
      prisma.lesson.count.mockResolvedValue(3);
      prisma.lessonProgress.count.mockResolvedValue(3);

      const completionDate = new Date();
      prisma.enrollment.update.mockResolvedValue({
        id: 'enr-1',
        progressPercentage: 100,
        completedAt: completionDate,
      });

      const result = await service.completeLesson('student-1', 'lesson-2');

      expect(result.progressPercentage).toBe(100);
      expect(result.courseCompleted).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COURSE_COMPLETED',
            entityId: 'course-1',
          }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'student-1',
            title: expect.stringContaining('Course Completed'),
          }),
        }),
      );
    });

    it('should reject completeLesson if student is not enrolled', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(mockLesson1Full);
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.completeLesson('student-1', 'lesson-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should uncomplete lesson, reset progress, and clear completedAt timestamp', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.lesson.findUnique.mockResolvedValue(mockLesson1Full);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: 'student-1',
        courseId: 'course-1',
        completedAt: new Date(),
      });

      prisma.lessonProgress.delete.mockResolvedValue({});
      prisma.lesson.count.mockResolvedValue(3);
      prisma.lessonProgress.count.mockResolvedValue(2); // Was 3, now 2

      prisma.enrollment.update.mockResolvedValue({
        id: 'enr-1',
        progressPercentage: 66.67,
        completedAt: null,
      });

      const result = await service.uncompleteLesson('student-1', 'lesson-1');

      expect(result.completed).toBe(false);
      expect(result.completedLessons).toBe(2);
      expect(result.progressPercentage).toBe(66.67);
      expect(result.courseCompleted).toBe(false);
      expect(prisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: null }),
        }),
      );
    });
  });

  describe('3. Course Player Syllabus & Resume Learning', () => {
    it('should return course player syllabus with completed indicators and resume bookmark', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.course.findFirst.mockResolvedValue(mockCourse);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: 'student-1',
        courseId: 'course-1',
        progressPercentage: 33.33,
        completedAt: null,
        enrolledAt: new Date(),
        lessonProgress: [
          { lessonId: 'lesson-1', completed: true },
        ],
      });

      const player = await service.getCoursePlayer('student-1', 'course-1');

      expect(player).toBeDefined();
      expect(player.course.id).toBe('course-1');
      expect(player.totalLessons).toBe(3);
      expect(player.completedLessons).toBe(1);
      expect(player.progressPercentage).toBe(33.33);

      // Lesson 1 is completed
      expect(player.sections[0]?.lessons[0]?.isCompleted).toBe(true);
      // Lesson 2 is incomplete
      expect(player.sections[0]?.lessons[1]?.isCompleted).toBe(false);

      // Resume bookmark points to the first incomplete lesson (lesson-2)
      expect(player.resumeLesson).toBeDefined();
      expect(player.resumeLesson.id).toBe('lesson-2');
    });

    it('should deny course player access to non-enrolled user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.course.findFirst.mockResolvedValue(mockCourse);
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.getCoursePlayer('student-1', 'course-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should accurately resolve resume lesson pointer via getResumeLesson', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserActiveStudent);
      prisma.course.findFirst.mockResolvedValue(mockCourse);
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enr-1',
        userId: 'student-1',
        courseId: 'course-1',
        progressPercentage: 33.33,
        completedAt: null,
        enrolledAt: new Date(),
        lessonProgress: [{ lessonId: 'lesson-1', completed: true }],
      });

      const resumeData = await service.getResumeLesson('student-1', 'course-1');

      expect(resumeData.courseId).toBe('course-1');
      expect(resumeData.resumeLesson.id).toBe('lesson-2');
      expect(resumeData.progressPercentage).toBe(33.33);
    });
  });
});
