import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService, NotificationType } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsService (Phase 8G: Notifications)', () => {
  let service: NotificationsService;
  let prisma: any;
  let mailService: any;
  let gateway: any;

  const mockUserA = {
    id: 'user-aaa-111',
    email: 'student.a@aau.edu.et',
    fullName: 'Student Abebe',
    isActive: true,
  };

  const mockUserB = {
    id: 'user-bbb-222',
    email: 'student.b@aau.edu.et',
    fullName: 'Student Kebede',
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    mailService = {
      sendNotificationEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    gateway = {
      emitToUser: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('1. In-App Notifications & Ownership Isolation', () => {
    it('should retrieve student notifications strictly scoped to caller userId', async () => {
      const mockItems = [
        {
          id: 'notif-1',
          userId: mockUserA.id,
          title: 'Quiz Passed',
          message: 'You scored 95%',
          type: NotificationType.QUIZ_RESULT,
          actionUrl: '/app/quizzes',
          isRead: false,
          metadata: { quizId: 'q-1' },
          createdAt: new Date(),
        },
      ];

      prisma.notification.findMany.mockResolvedValue(mockItems);

      const res = await service.getMyNotifications(mockUserA.id);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserA.id },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(res).toHaveLength(1);
      expect(res[0]?.link).toBe('/app/quizzes');
    });

    it('should support filtering by type and read status', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.getMyNotifications(mockUserA.id, {
        type: NotificationType.ASSIGNMENT_DEADLINE,
        isRead: false,
        limit: 10,
        offset: 0,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserA.id,
            type: NotificationType.ASSIGNMENT_DEADLINE,
            isRead: false,
          },
          take: 10,
          skip: 0,
        }),
      );
    });

    it('should return accurate unread count for authenticated user', async () => {
      prisma.notification.count.mockResolvedValue(4);

      const res = await service.getUnreadCount(mockUserA.id);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: mockUserA.id, isRead: false },
      });
      expect(res.count).toBe(4);
    });
  });

  describe('2. Read Status & Deletion Ownership Guards', () => {
    it('should mark single notification as read if owned by caller', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: mockUserA.id,
        isRead: false,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
      });

      const updated = await service.markAsRead(mockUserA.id, 'notif-1');

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: mockUserA.id },
      });
      expect(updated.isRead).toBe(true);
    });

    it('should throw NotFoundException if user attempts to mark another user notification as read', async () => {
      // User B tries to read User A's notification
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(mockUserB.id, 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should mark all unread notifications as read for current user only', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await service.markAllAsRead(mockUserA.id);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserA.id, isRead: false },
        data: { isRead: true },
      });
      expect(res.count).toBe(5);
    });

    it('should delete notification if owned by caller', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: mockUserA.id,
      });
      prisma.notification.delete.mockResolvedValue({});

      const res = await service.deleteNotification(mockUserA.id, 'notif-1');
      expect(res.message).toContain('successfully deleted');
    });

    it('should throw NotFoundException if deleting another user notification', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.deleteNotification(mockUserB.id, 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('3. Notification Preferences', () => {
    it('should provision default preferences if none exist', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      prisma.notificationPreference.create.mockResolvedValue({
        userId: mockUserA.id,
        emailEnrollment: true,
        emailAnnouncement: true,
        emailDeadline: true,
        emailGrading: true,
        emailQuizResult: true,
        emailCompletion: true,
        emailCertificate: true,
        emailInvitation: true,
        inAppNotifications: true,
      });

      const prefs = await service.getPreferences(mockUserA.id);

      expect(prisma.notificationPreference.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: mockUserA.id }),
        }),
      );
      expect(prefs.emailQuizResult).toBe(true);
    });

    it('should update preferences accurately', async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({
        userId: mockUserA.id,
        emailQuizResult: false,
        inAppNotifications: true,
      });

      const updated = await service.updatePreferences(mockUserA.id, {
        emailQuizResult: false,
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserA.id },
          update: expect.objectContaining({ emailQuizResult: false }),
        }),
      );
      expect(updated.emailQuizResult).toBe(false);
    });
  });

  describe('4. Dispatch Pipeline & Notification Types', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockUserA);
      prisma.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserA.id,
        emailEnrollment: true,
        emailAnnouncement: true,
        emailDeadline: true,
        emailGrading: true,
        emailQuizResult: true,
        emailCompletion: true,
        emailCertificate: true,
        emailInvitation: true,
        inAppNotifications: true,
      });
      prisma.notification.create.mockResolvedValue({
        id: 'new-notif-1',
        userId: mockUserA.id,
        title: 'New Grade Posted',
        message: 'Your score is 100%',
        type: NotificationType.ASSIGNMENT_GRADING,
        createdAt: new Date(),
      });
      mailService.sendNotificationEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-ok-1',
      });
    });

    it('should dispatch assignment grading notification with in-app, email, and socket', async () => {
      const res = await service.dispatch({
        userId: mockUserA.id,
        type: NotificationType.ASSIGNMENT_GRADING,
        title: 'Assignment Graded 📝',
        message: 'Your assignment scored 95/100',
        metadata: { assignmentId: 'a-1' },
      });

      expect(res.inAppDelivered).toBe(true);
      expect(res.emailDelivered).toBe(true);
      expect(res.realtimeDelivered).toBe(true);
      expect(mailService.sendNotificationEmail).toHaveBeenCalledWith(
        mockUserA.email,
        'Assignment Graded 📝',
        'Your assignment scored 95/100',
      );
      expect(gateway.emitToUser).toHaveBeenCalledWith(
        mockUserA.id,
        expect.objectContaining({ title: 'Assignment Graded 📝' }),
      );
    });

    it('should respect user email preference and suppress email if disabled', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserA.id,
        emailQuizResult: false, // User disabled quiz result emails
        inAppNotifications: true,
      });

      const res = await service.dispatch({
        userId: mockUserA.id,
        type: NotificationType.QUIZ_RESULT,
        title: 'Quiz Passed 🎯',
        message: 'You scored 88%',
        idempotencyKey: 'quiz-res-unique-1',
      });

      expect(res.inAppDelivered).toBe(true);
      expect(res.emailDelivered).toBe(false); // Suppressed
      expect(mailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('should respect inAppNotifications preference and suppress in-app if disabled', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue({
        userId: mockUserA.id,
        emailEnrollment: true,
        inAppNotifications: false, // User disabled in-app
      });

      const res = await service.dispatch({
        userId: mockUserA.id,
        type: NotificationType.ENROLLMENT,
        title: 'Enrolled in Course',
        message: 'Welcome to Cloud Computing',
        idempotencyKey: 'enr-unique-1',
      });

      expect(res.inAppDelivered).toBe(false);
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(res.emailDelivered).toBe(true);
    });

    it('should prevent duplicate notification events within deduplication window', async () => {
      const payload = {
        userId: mockUserA.id,
        type: NotificationType.COURSE_ANNOUNCEMENT,
        title: 'Class Cancelled Today',
        message: 'No class due to public holiday',
        idempotencyKey: 'dedupe-test-key-1',
      };

      const firstCall = await service.dispatch(payload);
      expect(firstCall.duplicated).toBe(false);

      const secondCall = await service.dispatch(payload);
      expect(secondCall.duplicated).toBe(true);
      expect(secondCall.inAppDelivered).toBe(false);
    });

    it('should strip sensitive credentials from notification metadata', async () => {
      await service.dispatch({
        userId: mockUserA.id,
        type: NotificationType.INSTITUTION_INVITATION,
        title: 'Faculty Invitation',
        message: 'You have been invited to AAU',
        metadata: {
          institutionId: 'inst-1',
          passwordHash: 'secret-hash',
          token: 'raw-token',
        },
        idempotencyKey: 'invite-sanitization-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { institutionId: 'inst-1' }, // passwordHash and token removed
          }),
        }),
      );
    });

    it('should handle failed email delivery gracefully without claiming success', async () => {
      mailService.sendNotificationEmail.mockResolvedValue({
        success: false,
        error: 'SMTP Connection timeout or bounce',
      });

      const res = await service.dispatch({
        userId: mockUserA.id,
        type: NotificationType.CERTIFICATE,
        title: 'Certificate Issued 🎓',
        message: 'Your certificate is ready',
        idempotencyKey: 'cert-fail-key-1',
      });

      expect(res.inAppDelivered).toBe(true);
      expect(res.emailDelivered).toBe(false);
      expect(res.emailError).toBe('SMTP Connection timeout or bounce');
    });
  });
});
