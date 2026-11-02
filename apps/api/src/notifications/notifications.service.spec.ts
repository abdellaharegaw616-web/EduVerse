import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  const studentA = 'student-uuid-aaa';

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('getMyNotifications', () => {
    it('should retrieve student notifications ordered by newest first', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: studentA,
          title: 'Assignment Graded',
          message: 'Your assignment scored 98%',
          type: 'GRADE_POSTED',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      prisma.notification.findMany.mockResolvedValue(mockNotifications);

      const results = await service.getMyNotifications(studentA);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: studentA },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Assignment Graded');
    });
  });

  describe('markAsRead', () => {
    it('should verify ownership before marking a single notification as read', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: studentA,
        isRead: false,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
      });

      const updated = await service.markAsRead(studentA, 'notif-1');

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: studentA },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
      expect(updated.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should update unread notifications for the caller only', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const res = await service.markAllAsRead(studentA);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: studentA, isRead: false },
        data: { isRead: true },
      });
      expect(res.count).toBe(3);
    });
  });
});

