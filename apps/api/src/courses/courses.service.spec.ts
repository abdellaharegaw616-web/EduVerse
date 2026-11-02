import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PrismaService, CourseStatus } from '../database/prisma.service';

describe('CoursesService - Teacher Course Management & Ownership', () => {
  let service: CoursesService;
  let prisma: any;

  const teacherA = 'teacher-uuid-aaa';
  const teacherB = 'teacher-uuid-bbb';
  const superAdmin = 'superadmin-uuid-root';

  beforeEach(async () => {
    prisma = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('getTeacherDashboard', () => {
    it('aggregates teacher courses, drafts, pending reviews, and pending submissions', async () => {
      const mockCourses = [
        {
          id: 'c-1',
          title: 'Distributed Systems',
          slug: 'distributed-systems',
          status: CourseStatus.PUBLISHED,
          authorId: teacherA,
          enrollments: [{ id: 'enr-1', progressPercentage: 100, completedAt: new Date() }],
          sections: [
            {
              lessons: [
                {
                  id: 'l-1',
                  assignment: {
                    submissions: [{ id: 'sub-1' }],
                  },
                },
              ],
            },
          ],
          updatedAt: new Date(),
        },
        {
          id: 'c-2',
          title: 'Compiler Design',
          slug: 'compiler-design',
          status: CourseStatus.DRAFT,
          authorId: teacherA,
          enrollments: [],
          sections: [],
          updatedAt: new Date(),
        },
        {
          id: 'c-3',
          title: 'Cloud Architecture',
          slug: 'cloud-architecture',
          status: CourseStatus.PENDING_REVIEW,
          authorId: teacherA,
          enrollments: [],
          sections: [],
          updatedAt: new Date(),
        },
      ];

      prisma.course.findMany.mockResolvedValue(mockCourses);
      prisma.enrollment.findMany.mockResolvedValue([]);
      prisma.assignmentSubmission.findMany.mockResolvedValue([]);

      const result = await service.getTeacherDashboard(teacherA);

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: teacherA },
        }),
      );

      expect(result.stats.totalCourses).toBe(3);
      expect(result.stats.publishedCount).toBe(1);
      expect(result.stats.draftCount).toBe(1);
      expect(result.stats.pendingReviewCount).toBe(1);
      expect(result.stats.totalStudents).toBe(1);
      expect(result.stats.pendingSubmissionsCount).toBe(1);
    });
  });

  describe('Strict Course Ownership Guard', () => {
    const courseOfTeacherA = {
      id: 'c-100',
      title: 'Course Owned By Teacher A',
      slug: 'course-owned-by-teacher-a',
      authorId: teacherA,
      status: CourseStatus.DRAFT,
      sections: [],
      _count: { enrollments: 0 },
    };

    it('allows Author Teacher A to manage their course', async () => {
      prisma.course.findUnique.mockResolvedValue(courseOfTeacherA);

      const course = await service.getCourseForTeacher(teacherA, 'c-100');
      expect(course.id).toBe('c-100');
    });

    it('allows SUPER_ADMIN to inspect and manage any teacher course', async () => {
      prisma.course.findUnique.mockResolvedValue(courseOfTeacherA);

      const course = await service.getCourseForTeacher(superAdmin, 'c-100', true);
      expect(course.id).toBe('c-100');
    });

    it('strictly forbids Teacher B from accessing Teacher A course (403 Forbidden)', async () => {
      prisma.course.findUnique.mockResolvedValue(courseOfTeacherA);

      await expect(
        service.getCourseForTeacher(teacherB, 'c-100'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly forbids Teacher B from updating Teacher A course (403 Forbidden)', async () => {
      prisma.course.findUnique.mockResolvedValue(courseOfTeacherA);

      await expect(
        service.updateCourse(teacherB, 'c-100', { title: 'Hijacked Title' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly forbids Teacher B from deleting Teacher A course (403 Forbidden)', async () => {
      prisma.course.findUnique.mockResolvedValue(courseOfTeacherA);

      await expect(
        service.deleteCourse(teacherB, 'c-100'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.getCourseForTeacher(teacherA, 'non-existent-course'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Sections & Lessons Ownership Guard', () => {
    it('prevents Teacher B from creating a section in Teacher A course', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'c-100',
        authorId: teacherA,
      });

      await expect(
        service.createSection(teacherB, 'c-100', { title: 'Module 1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents Teacher B from adding a lesson to Teacher A section', async () => {
      prisma.courseSection.findUnique.mockResolvedValue({
        id: 'sec-100',
        course: { id: 'c-100', authorId: teacherA },
      });

      await expect(
        service.createLesson(teacherB, 'sec-100', {
          title: 'Lesson 1',
          content: 'Content',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Grade Student Submissions', () => {
    const submissionInTeacherACourse = {
      id: 'sub-99',
      assignmentId: 'assign-99',
      assignment: {
        maxScore: 100,
        lesson: {
          section: {
            course: { id: 'c-100', authorId: teacherA },
          },
        },
      },
    };

    it('allows author Teacher A to grade student submission', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue(submissionInTeacherACourse);
      prisma.assignmentSubmission.update.mockResolvedValue({
        id: 'sub-99',
        grade: 95,
        status: 'GRADED',
      });

      const graded = await service.gradeSubmission(teacherA, 'sub-99', {
        grade: 95,
        feedback: 'Excellent work',
      });

      expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-99' },
          data: expect.objectContaining({
            grade: 95,
            feedback: 'Excellent work',
            status: 'GRADED',
          }),
        }),
      );
      expect(graded.status).toBe('GRADED');
    });

    it('rejects grade exceeding max score (400 BadRequest)', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue(submissionInTeacherACourse);

      await expect(
        service.gradeSubmission(teacherA, 'sub-99', { grade: 105, feedback: 'Too generous' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('forbids Teacher B from grading Teacher A course submission (403 Forbidden)', async () => {
      prisma.assignmentSubmission.findUnique.mockResolvedValue(submissionInTeacherACourse);

      await expect(
        service.gradeSubmission(teacherB, 'sub-99', { grade: 90 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

