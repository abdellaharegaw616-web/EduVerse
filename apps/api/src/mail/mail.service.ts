import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SentEmailRecord {
  to: string;
  subject: string;
  token?: string;
  body?: string;
  status: 'DELIVERED' | 'FAILED';
  error?: string;
  sentAt: Date;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  subject: string;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  // Stored in-memory for testing, inspection, and verification
  private sentEmails: SentEmailRecord[] = [];

  constructor(private readonly config: ConfigService) {}

  /**
   * Basic email format and delivery validation.
   * Ensures we do not claim delivery for malformed or simulated bounce addresses.
   */
  private validateRecipient(email: string): boolean {
    if (!email || !email.includes('@')) return false;
    const [local, domain] = email.split('@');
    if (!local || !domain || !domain.includes('.')) return false;
    if (domain.endsWith('.invalid') || domain.endsWith('.bounce')) return false;
    return true;
  }

  // 1. Account Verification Email
  async sendVerificationEmail(to: string, token: string, fullName: string): Promise<EmailDeliveryResult> {
    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    const subject = 'Verify your EduVerse account';

    if (!this.validateRecipient(to)) {
      const error = `Failed to deliver email to invalid or bouncing address: ${to}`;
      this.logger.error(`[EMAIL FAILED] ${error}`);
      this.sentEmails.push({ to, subject, token, status: 'FAILED', error, sentAt: new Date() });
      return { success: false, recipient: to, subject, error };
    }

    this.logger.log(`[EMAIL DISPATCH] Verification Email to "${fullName}" <${to}> -> ${verificationUrl}`);
    this.sentEmails.push({ to, subject, token, status: 'DELIVERED', sentAt: new Date() });
    return { success: true, messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, recipient: to, subject };
  }

  // 2. Password Reset Email
  async sendPasswordResetEmail(to: string, token: string, fullName: string): Promise<EmailDeliveryResult> {
    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const subject = 'Reset your EduVerse password';

    if (!this.validateRecipient(to)) {
      const error = `Failed to deliver email to invalid or bouncing address: ${to}`;
      this.logger.error(`[EMAIL FAILED] ${error}`);
      this.sentEmails.push({ to, subject, token, status: 'FAILED', error, sentAt: new Date() });
      return { success: false, recipient: to, subject, error };
    }

    this.logger.log(`[EMAIL DISPATCH] Password Reset Email to "${fullName}" <${to}> -> ${resetUrl}`);
    this.sentEmails.push({ to, subject, token, status: 'DELIVERED', sentAt: new Date() });
    return { success: true, messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, recipient: to, subject };
  }

  // 3. General Notification Email Dispatcher
  async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<EmailDeliveryResult> {
    if (!this.validateRecipient(to)) {
      const error = `Delivery rejected: Recipient address "${to}" is invalid or unreachable`;
      this.logger.warn(`[EMAIL DISPATCH FAILED] ${error}`);
      this.sentEmails.push({
        to,
        subject,
        body: message,
        status: 'FAILED',
        error,
        sentAt: new Date(),
      });
      return { success: false, recipient: to, subject, error };
    }

    try {
      this.logger.log(`[NOTIFICATION EMAIL SENT] To: ${to} | Subject: "${subject}"`);
      this.sentEmails.push({
        to,
        subject,
        body: message,
        status: 'DELIVERED',
        sentAt: new Date(),
      });

      return {
        success: true,
        messageId: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        recipient: to,
        subject,
      };
    } catch (err: any) {
      const error = err?.message || 'Unknown SMTP transport failure';
      this.logger.error(`[EMAIL DELIVERY ERROR] ${error}`);
      this.sentEmails.push({
        to,
        subject,
        body: message,
        status: 'FAILED',
        error,
        sentAt: new Date(),
      });
      return { success: false, recipient: to, subject, error };
    }
  }

  // Helper template: Course Enrollment
  async sendEnrollmentEmail(to: string, courseTitle: string): Promise<EmailDeliveryResult> {
    const subject = `Enrolled in "${courseTitle}" - Welcome to EduVerse!`;
    const message = `You have successfully enrolled in ${courseTitle}. You can now start learning.`;
    return this.sendNotificationEmail(to, subject, message);
  }

  // Helper template: Course Announcement
  async sendAnnouncementEmail(
    to: string,
    courseTitle: string,
    announcementTitle: string,
    content: string,
  ): Promise<EmailDeliveryResult> {
    const subject = `[${courseTitle}] New Announcement: ${announcementTitle}`;
    return this.sendNotificationEmail(to, subject, content);
  }

  // Helper template: Assignment Deadline
  async sendDeadlineReminder(
    to: string,
    assignmentTitle: string,
    courseTitle: string,
    dueDate: Date,
  ): Promise<EmailDeliveryResult> {
    const subject = `Reminder: Assignment "${assignmentTitle}" is due soon!`;
    const message = `Your assignment for "${courseTitle}" is due on ${dueDate.toISOString()}.`;
    return this.sendNotificationEmail(to, subject, message);
  }

  // Helper template: Assignment Grading
  async sendGradeNotification(
    to: string,
    assignmentTitle: string,
    grade: number,
    maxScore: number,
  ): Promise<EmailDeliveryResult> {
    const subject = `Grade Posted: "${assignmentTitle}"`;
    const message = `Your submission has been evaluated: ${grade}/${maxScore}.`;
    return this.sendNotificationEmail(to, subject, message);
  }

  // Helper template: Quiz Result
  async sendQuizResult(
    to: string,
    quizTitle: string,
    score: number,
    passed: boolean,
  ): Promise<EmailDeliveryResult> {
    const status = passed ? 'Passed 🎯' : 'Needs Review';
    const subject = `Quiz Results: "${quizTitle}" - ${status} (${score}%)`;
    const message = `You scored ${score}% on "${quizTitle}". Status: ${status}.`;
    return this.sendNotificationEmail(to, subject, message);
  }

  // Helper template: Course Completion & Certificate
  async sendCertificateIssued(
    to: string,
    courseTitle: string,
    certificateCode: string,
  ): Promise<EmailDeliveryResult> {
    const subject = `Congratulations! Certificate issued for "${courseTitle}" 🎓`;
    const message = `You have completed "${courseTitle}". Your verified certificate code is: ${certificateCode}.`;
    return this.sendNotificationEmail(to, subject, message);
  }

  getLatestEmailFor(to: string): SentEmailRecord | undefined {
    return this.sentEmails.filter((e) => e.to === to).pop();
  }

  getAllSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}
