import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService, NotificationType } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsGateway } from './notifications.gateway';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preferences.dto';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  // In-memory idempotency deduplication cache: key -> timestamp
  private recentDispatches = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly gateway: NotificationsGateway,
  ) {}

  // -------------------------------------------------------------
  // 1. IN-APP NOTIFICATION RETRIEVAL & UNREAD COUNT
  // -------------------------------------------------------------

  async getMyNotifications(userId: string, query?: GetNotificationsQueryDto) {
    const whereClause: any = { userId };

    if (query?.type) {
      whereClause.type = query.type;
    }
    if (query?.isRead !== undefined) {
      whereClause.isRead = query.isRead;
    }

    const notifications = await this.prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 50,
      skip: query?.offset || 0,
    });

    // Project and format for client consumers (including backward-compatible `link`)
    return notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      actionUrl: n.actionUrl,
      link: n.actionUrl, // compatibility with frontend NotificationItem
      metadata: n.metadata,
      createdAt: n.createdAt,
    }));
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  // -------------------------------------------------------------
  // 2. MARK AS READ & DELETION (OWNERSHIP ENFORCED)
  // -------------------------------------------------------------

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification successfully deleted' };
  }

  // -------------------------------------------------------------
  // 3. NOTIFICATION PREFERENCES
  // -------------------------------------------------------------

  async getPreferences(userId: string) {
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailEnrollment: true,
          emailAnnouncement: true,
          emailDeadline: true,
          emailGrading: true,
          emailQuizResult: true,
          emailCompletion: true,
          emailCertificate: true,
          emailInvitation: true,
          inAppNotifications: true,
        },
      });
    }

    return pref;
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailEnrollment: dto.emailEnrollment ?? true,
        emailAnnouncement: dto.emailAnnouncement ?? true,
        emailDeadline: dto.emailDeadline ?? true,
        emailGrading: dto.emailGrading ?? true,
        emailQuizResult: dto.emailQuizResult ?? true,
        emailCompletion: dto.emailCompletion ?? true,
        emailCertificate: dto.emailCertificate ?? true,
        emailInvitation: dto.emailInvitation ?? true,
        inAppNotifications: dto.inAppNotifications ?? true,
      },
      update: {
        ...(dto.emailEnrollment !== undefined && { emailEnrollment: dto.emailEnrollment }),
        ...(dto.emailAnnouncement !== undefined && { emailAnnouncement: dto.emailAnnouncement }),
        ...(dto.emailDeadline !== undefined && { emailDeadline: dto.emailDeadline }),
        ...(dto.emailGrading !== undefined && { emailGrading: dto.emailGrading }),
        ...(dto.emailQuizResult !== undefined && { emailQuizResult: dto.emailQuizResult }),
        ...(dto.emailCompletion !== undefined && { emailCompletion: dto.emailCompletion }),
        ...(dto.emailCertificate !== undefined && { emailCertificate: dto.emailCertificate }),
        ...(dto.emailInvitation !== undefined && { emailInvitation: dto.emailInvitation }),
        ...(dto.inAppNotifications !== undefined && { inAppNotifications: dto.inAppNotifications }),
      },
    });
  }

  // -------------------------------------------------------------
  // 4. DISPATCH NOTIFICATION (IN-APP + EMAIL + REALTIME + DEDUPLICATION)
  // -------------------------------------------------------------

  async dispatch(dto: DispatchNotificationDto) {
    const now = Date.now();
    const dedupeKey =
      dto.idempotencyKey ||
      `${dto.userId}:${dto.type}:${dto.title}:${JSON.stringify(dto.metadata || {})}`;

    // 1. Deduplication Protection (5-minute sliding window)
    const lastDispatched = this.recentDispatches.get(dedupeKey);
    if (lastDispatched && now - lastDispatched < 5 * 60 * 1000) {
      this.logger.warn(`[NOTIFICATION DEDUPLICATED] Ignored duplicate event: ${dedupeKey}`);
      return {
        duplicated: true,
        inAppDelivered: false,
        emailDelivered: false,
        realtimeDelivered: false,
      };
    }

    this.recentDispatches.set(dedupeKey, now);

    // Clean up stale keys older than 10 minutes
    if (this.recentDispatches.size > 2000) {
      for (const [key, timestamp] of this.recentDispatches.entries()) {
        if (now - timestamp > 10 * 60 * 1000) {
          this.recentDispatches.delete(key);
        }
      }
    }

    // 2. Fetch User & Preferences
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, email: true, fullName: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      this.logger.warn(`[NOTIFICATION ABORTED] Target user ${dto.userId} is inactive or not found`);
      return {
        duplicated: false,
        inAppDelivered: false,
        emailDelivered: false,
        realtimeDelivered: false,
      };
    }

    const prefs = await this.getPreferences(dto.userId);

    // 3. Privacy Filter: Strip credentials or secrets from metadata
    const sanitizedMetadata: Record<string, any> = { ...dto.metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.passwordHash;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.tokenHash;

    let inAppNotification: any = null;
    let inAppDelivered = false;

    // 4. In-App Notification Record Persistence
    if (prefs.inAppNotifications !== false) {
      inAppNotification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          actionUrl: dto.actionUrl || null,
          metadata: sanitizedMetadata,
        },
      });
      inAppDelivered = true;
    }

    // 5. Real-Time Socket Delivery
    let realtimeDelivered = false;
    if (inAppNotification) {
      realtimeDelivered = this.gateway.emitToUser(dto.userId, {
        id: inAppNotification.id,
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        actionUrl: dto.actionUrl || null,
        createdAt: inAppNotification.createdAt,
      });
    }

    // 6. Email Delivery with Provider Validation
    let emailDelivered = false;
    let emailError: string | undefined;

    const isEmailAllowed = this.checkEmailPreference(prefs, dto.type);

    if (isEmailAllowed && user.email) {
      const emailResult = await this.mailService.sendNotificationEmail(
        user.email,
        dto.title,
        dto.message,
      );

      emailDelivered = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error;
        this.logger.warn(
          `[NOTIFICATION EMAIL FAILED] Could not deliver to ${user.email}: ${emailError}`,
        );
      }
    }

    return {
      duplicated: false,
      notificationId: inAppNotification?.id,
      inAppDelivered,
      emailDelivered,
      emailError,
      realtimeDelivered,
    };
  }

  private checkEmailPreference(
    prefs: any,
    type: NotificationType,
  ): boolean {
    switch (type) {
      case NotificationType.ENROLLMENT:
        return prefs.emailEnrollment ?? true;
      case NotificationType.COURSE_ANNOUNCEMENT:
        return prefs.emailAnnouncement ?? true;
      case NotificationType.ASSIGNMENT_DEADLINE:
        return prefs.emailDeadline ?? true;
      case NotificationType.ASSIGNMENT_GRADING:
        return prefs.emailGrading ?? true;
      case NotificationType.QUIZ_RESULT:
        return prefs.emailQuizResult ?? true;
      case NotificationType.COURSE_COMPLETION:
        return prefs.emailCompletion ?? true;
      case NotificationType.CERTIFICATE:
        return prefs.emailCertificate ?? true;
      case NotificationType.INSTITUTION_INVITATION:
        return prefs.emailInvitation ?? true;
      case NotificationType.SYSTEM:
      default:
        return true;
    }
  }
}
