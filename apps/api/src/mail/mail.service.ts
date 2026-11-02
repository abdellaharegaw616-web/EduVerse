import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SentEmailRecord {
  to: string;
  subject: string;
  token: string;
  sentAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  // In development and test modes, we store sent emails in-memory so tests can inspect actual delivered tokens
  private sentEmails: SentEmailRecord[] = [];

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(to: string, token: string, fullName: string): Promise<void> {
    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    this.logger.log(`[EMAIL DISPATCH] Verification Email to "${fullName}" <${to}> (Token: ${token}) -> ${verificationUrl}`);

    this.sentEmails.push({
      to,
      subject: 'Verify your EduVerse account',
      token,
      sentAt: new Date(),
    });
  }

  async sendPasswordResetEmail(to: string, token: string, fullName: string): Promise<void> {
    const frontendUrl = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    this.logger.log(`[EMAIL DISPATCH] Password Reset Email to "${fullName}" <${to}> (Token: ${token}) -> ${resetUrl}`);

    this.sentEmails.push({
      to,
      subject: 'Reset your EduVerse password',
      token,
      sentAt: new Date(),
    });
  }

  getLatestEmailFor(to: string): SentEmailRecord | undefined {
    return this.sentEmails.filter((e) => e.to === to).pop();
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}
