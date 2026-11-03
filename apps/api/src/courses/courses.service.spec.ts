import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PrismaService, CourseStatus, CourseDifficulty } from '../database/prisma.service';

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
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      courseSection: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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
        findUnique: jest.fn(),
      },
      quizAttempt: {
        findMany: jest.fn(),
      },
      courseCategory: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      lessonResource: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      review: {
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
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

  describe('Phase 8A: Course Creation with Rich Metadata', () => {
    it('creates course with thumbnail, difficulty, language, learning objectives, and prerequisites', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      prisma.course.create.mockResolvedValue({
        id: 'c-rich-1',
        title: 'Distributed Systems',
        slug: 'distributed-systems',
        thumbnailUrl: 'https://cdn.eduverse.et/thumb.jpg',
        difficulty: CourseDifficulty.ADVANCED,
        language: 'English',
        learningObjectives: ['Master Raft consensus'],
        prerequisites: ['TypeScript Fundamentals'],
        estimatedHours: 20,
        status: CourseStatus.DRAFT,
        authorId: teacherA,
      });

      const res = await service.createCourse(teacherA, {
        title: 'Distributed Systems',
        description: 'Comprehensive guide to building distributed systems in TypeScript.',
        thumbnailUrl: 'https://cdn.eduverse.et/thumb.jpg',
        difficulty: CourseDifficulty.ADVANCED,
        language: 'English',
        learningObjectives: ['Master Raft consensus'],
        prerequisites: ['TypeScript Fundamentals'],
        estimatedHours: 20,
      });

      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Distributed Systems',
            thumbnailUrl: 'https://cdn.eduverse.et/thumb.jpg',
            difficulty: CourseDifficulty.ADVANCED,
            language: 'English',
            learningObjectives: ['Master Raft consensus'],
            prerequisites: ['TypeScript Fundamentals'],
            estimatedHours: 20,
            status: CourseStatus.DRAFT,
            authorId: teacherA,
          }),
        }),
      );
      expect(res.id).toBe('c-rich-1');
    });
  });

  describe('Phase 8A: Moderation & Publishing Lifecycle', () => {
    const courseFixture = {
      id: 'c-mod-1',
      title: 'Full Stack TypeScript',
      authorId: teacherA,
      status: CourseStatus.DRAFT,
    };

    it('rejects submitting course for review if it has no sections or lessons (400 BadRequest)', async () => {
      prisma.course.findUnique.mockResolvedValue(courseFixture);
      prisma.courseSection.findMany.mockResolvedValue([]); // No sections

      await expect(
        service.submitCourseForReview(teacherA, 'c-mod-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('submits course for review when valid curriculum exists', async () => {
      prisma.course.findUnique.mockResolvedValue(courseFixture);
      prisma.courseSection.findMany.mockResolvedValue([
        { id: 'sec-1', _count: { lessons: 2 } },
      ]);
      prisma.course.update.mockResolvedValue({
        ...courseFixture,
        status: CourseStatus.PENDING_REVIEW,
      });
      prisma.auditLog.create.mockResolvedValue({});

      const updated = await service.submitCourseForReview(teacherA, 'c-mod-1');

      expect(prisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c-mod-1' },
        data: { status: CourseStatus.PENDING_REVIEW },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COURSE_SUBMITTED_FOR_REVIEW',
            entityId: 'c-mod-1',
          }),
        }),
      );
      expect(updated.status).toBe(CourseStatus.PENDING_REVIEW);
    });

    it('forbids Teacher B from submitting Teacher A course for review (403 Forbidden)', async () => {
      prisma.course.findUnique.mockResolvedValue(courseFixture);

      await expect(
        service.submitCourseForReview(teacherB, 'c-mod-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows publishing course when curriculum is populated', async () => {
      prisma.course.findUnique.mockResolvedValue(courseFixture);
      prisma.courseSection.findMany.mockResolvedValue([
        { id: 'sec-1', _count: { lessons: 1 } },
      ]);
      prisma.course.update.mockResolvedValue({
        ...courseFixture,
        status: CourseStatus.PUBLISHED,
      });
      prisma.auditLog.create.mockResolvedValue({});

      const published = await service.publishCourse(teacherA, 'c-mod-1');
      expect(published.status).toBe(CourseStatus.PUBLISHED);
    });

    it('allows archiving course', async () => {
      prisma.course.findUnique.mockResolvedValue(courseFixture);
      prisma.course.update.mockResolvedValue({
        ...courseFixture,
        status: CourseStatus.ARCHIVED,
      });
      prisma.auditLog.create.mockResolvedValue({});

      const archived = await service.archiveCourse(teacherA, 'c-mod-1');
      expect(archived.status).toBe(CourseStatus.ARCHIVED);
    });
  });

  describe('Phase 8A: Lesson Resources Management', () => {
    it('creates resource for lesson with ownership check', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        section: { course: { authorId: teacherA } },
      });
      prisma.lessonResource.create.mockResolvedValue({
        id: 'res-1',
        lessonId: 'lesson-1',
        title: 'Cheat Sheet PDF',
        fileUrl: 'https://cdn.eduverse.et/sheet.pdf',
        fileType: 'PDF',
        fileSize: 1024,
      });

      const res = await service.addLessonResource(teacherA, 'lesson-1', {
        title: 'Cheat Sheet PDF',
        fileUrl: 'https://cdn.eduverse.et/sheet.pdf',
        fileType: 'PDF',
        fileSize: 1024,
      });

      expect(res.id).toBe('res-1');
      expect(prisma.lessonResource.create).toHaveBeenCalled();
    });

    it('forbids unauthorized teacher from adding resource (403 Forbidden)', async () => {
      prisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        section: { course: { authorId: teacherA } },
      });

      await expect(
        service.addLessonResource(teacherB, 'lesson-1', {
          title: 'Unauthorized Doc',
          fileUrl: 'https://cdn.eduverse.et/doc.pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Phase 8A: Public Marketplace & Privacy Isolation', () => {
    it('queries only PUBLISHED courses for the public marketplace catalog', async () => {
      prisma.course.count.mockResolvedValue(1);
      prisma.course.findMany.mockResolvedValue([
        {
          id: 'c-pub-1',
          title: 'Machine Learning',
          slug: 'machine-learning',
          description: 'AI course',
          thumbnailUrl: null,
          language: 'English',
          difficulty: CourseDifficulty.INTERMEDIATE,
          learningObjectives: [],
          prerequisites: [],
          estimatedHours: 15,
          status: CourseStatus.PUBLISHED,
          category: { id: 'cat-1', name: 'AI', slug: 'ai' },
          institution: null,
          author: { id: 'auth-1', fullName: 'Dr. AI', profile: null },
          reviews: [{ rating: 5 }, { rating: 4 }],
          _count: { sections: 4, enrollments: 120, reviews: 2 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getMarketplaceCourses({
        search: 'Machine',
        difficulty: CourseDifficulty.INTERMEDIATE,
      });

      // Strict requirement: must filter by status: CourseStatus.PUBLISHED
      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CourseStatus.PUBLISHED,
          }),
        }),
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0]?.averageRating).toBe(4.5);
    });

    it('rejects public access to non-published draft courses for non-authors (404 NotFound)', async () => {
      prisma.course.findFirst.mockResolvedValue({
        id: 'c-draft-99',
        title: 'Secret Draft',
        status: CourseStatus.DRAFT,
        authorId: teacherA,
        sections: [],
        reviews: [],
        _count: { enrollments: 0, reviews: 0 },
      });

      await expect(
        service.getMarketplaceCourseDetails('c-draft-99', 'student-viewer-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Phase 8A: Course Reviews', () => {
    it('forbids review if student is not enrolled (403 Forbidden)', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.enrollment.findUnique.mockResolvedValue(null); // Not enrolled

      await expect(
        service.createReview('student-1', 'c-1', { rating: 5, comment: 'Great!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows enrolled student to submit review and audits action', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c-1' });
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1', userId: 'student-1', courseId: 'c-1' });
      prisma.review.upsert.mockResolvedValue({
        id: 'rev-1',
        rating: 5,
        comment: 'Great course!',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const rev = await service.createReview('student-1', 'c-1', { rating: 5, comment: 'Great course!' });

      expect(rev.id).toBe('rev-1');
      expect(prisma.review.upsert).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COURSE_REVIEW_SUBMITTED',
            entityId: 'rev-1',
          }),
        }),
      );
    });
  });
});


