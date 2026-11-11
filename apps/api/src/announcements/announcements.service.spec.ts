import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService, Role, NotificationType } from '../database/prisma.service';

describe('AnnouncementsService (Course & Institutional Notices)', () => {
  let service: AnnouncementsService;
  let prisma: any;
  let notificationsService: any;

  const teacherCaller = {
    id: 'teacher-1',
    email: 'teacher@eduverse.et',
    fullName: 'Dr. Abebe Kebede',
    role: Role.TEACHER,
    isActive: true,
    isEmailVerified: true,
  };

  const studentCaller = {
    id: 'student-1',
    email: 'student@eduverse.et',
    fullName: 'Almaz Tadesse',
    role: Role.STUDENT,
    isActive: true,
    isEmailVerified: true,
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      course: { findUnique: jest.fn(), findMany: jest.fn() },
      enrollment: { findMany: jest.fn(), findUnique: jest.fn() },
      institutionMember: { findMany: jest.fn(), findUnique: jest.fn() },
      announcement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    notificationsService = {
      dispatch: jest.fn().mockResolvedValue({ inAppDelivered: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  it('should publish course announcement and dispatch notifications to enrolled learners', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: teacherCaller.id, isActive: true });
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      title: 'Full-Stack Engineering',
      slug: 'fullstack-eng',
      authorId: teacherCaller.id,
      institutionId: 'inst-1',
    });
    prisma.announcement.create.mockResolvedValue({
      id: 'ann-1',
      title: 'Lab 2 Released',
      content: 'Check module 3 for instructions.',
      courseId: 'course-1',
      authorId: teacherCaller.id,
    });
    prisma.enrollment.findMany.mockResolvedValue([
      { userId: 'student-1' },
      { userId: 'student-2' },
    ]);

    const res = await service.createAnnouncement(teacherCaller, {
      title: 'Lab 2 Released',
      content: 'Check module 3 for instructions.',
      courseId: 'course-1',
    });

    expect(res.notifiedStudentsCount).toBe(2);
    expect(notificationsService.dispatch).toHaveBeenCalledTimes(2);
    expect(notificationsService.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'student-1',
        type: NotificationType.COURSE_ANNOUNCEMENT,
      }),
    );
  });

  it('should forbid instructor from publishing announcement for another author course', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: teacherCaller.id, isActive: true });
    prisma.course.findUnique.mockResolvedValue({
      id: 'course-other',
      authorId: 'other-teacher',
    });

    await expect(
      service.createAnnouncement(teacherCaller, {
        title: 'Unauthorized Notice',
        content: 'Should not publish',
        courseId: 'course-other',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return announcements scoped to enrolled courses for students', async () => {
    prisma.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
    prisma.course.findMany.mockResolvedValue([]);
    prisma.institutionMember.findMany.mockResolvedValue([{ institutionId: 'inst-1' }]);
    prisma.announcement.findMany.mockResolvedValue([{ id: 'ann-1', title: 'Welcome' }]);

    const list = await service.getMyAnnouncements(studentCaller.id);
    expect(list).toHaveLength(1);
    expect(prisma.announcement.findMany).toHaveBeenCalled();
  });

  it('should prevent unauthorized user from deleting another instructor announcement', async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: 'ann-1',
      authorId: 'other-teacher',
    });

    await expect(service.deleteAnnouncement(teacherCaller, 'ann-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw NotFoundException when deleting nonexistent announcement', async () => {
    prisma.announcement.findUnique.mockResolvedValue(null);

    await expect(service.deleteAnnouncement(teacherCaller, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
