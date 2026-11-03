import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService, NotificationType } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateCertificatePdf, CertificatePdfData } from './pdf-generator';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generates a cryptographically strong, non-guessable verification code.
   * Format: EV-{YEAR}-{16-CHAR-HEX-ENTROPY} (e.g. EV-2026-A1B2C3D4E5F60789)
   * 64 bits of random entropy makes brute-forcing impossible.
   */
  private generateSecureVerificationCode(): string {
    const year = new Date().getFullYear();
    const entropy = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `EV-${year}-${entropy}`;
  }

  // -------------------------------------------------------------
  // 1. STUDENT CERTIFICATES HISTORY
  // -------------------------------------------------------------

  async getMyCertificates(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        user: { select: { fullName: true, email: true } },
        enrollment: { select: { completedAt: true, progressPercentage: true } },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            author: { select: { fullName: true } },
            institution: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return certificates.map((cert) => ({
      id: cert.id,
      verificationCode: cert.verificationCode,
      courseTitle: cert.course.title,
      courseSlug: cert.course.slug,
      studentName: cert.user.fullName,
      instructorName: cert.course.author.fullName,
      institutionName: cert.course.institution?.name || 'EduVerse Academy',
      completionDate: cert.enrollment.completedAt || cert.issuedAt,
      issuedAt: cert.issuedAt,
      isRevoked: cert.isRevoked,
      revocationReason: cert.revocationReason,
      revokedAt: cert.revokedAt,
    }));
  }

  // -------------------------------------------------------------
  // 2. ELIGIBILITY VERIFICATION
  // -------------------------------------------------------------

  async checkEligibility(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        certificate: true,
        course: { select: { title: true } },
      },
    });

    if (!enrollment) {
      return {
        eligible: false,
        reason: 'You are not enrolled in this course.',
        progressPercentage: 0,
        completedAt: null,
        certificate: null,
      };
    }

    if (enrollment.certificate) {
      return {
        eligible: false,
        alreadyIssued: true,
        progressPercentage: enrollment.progressPercentage,
        completedAt: enrollment.completedAt,
        certificate: {
          id: enrollment.certificate.id,
          verificationCode: enrollment.certificate.verificationCode,
          issuedAt: enrollment.certificate.issuedAt,
        },
        reason: 'Certificate has already been issued for this course.',
      };
    }

    const isComplete =
      enrollment.progressPercentage >= 100 && enrollment.completedAt !== null;

    return {
      eligible: isComplete,
      alreadyIssued: false,
      progressPercentage: enrollment.progressPercentage,
      completedAt: enrollment.completedAt,
      certificate: null,
      reason: isComplete
        ? 'Curriculum completed! You are eligible to claim your certificate.'
        : `Course progress is at ${enrollment.progressPercentage}%. 100% completion required.`,
    };
  }

  // -------------------------------------------------------------
  // 3. CERTIFICATE GENERATION & CLAIMING (ATOMIC)
  // -------------------------------------------------------------

  async claimCertificate(userId: string, courseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended or inactive.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        certificate: true,
        course: {
          include: {
            author: { select: { fullName: true } },
            institution: { select: { name: true } },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course.');
    }

    // 1. Idempotency & Duplicate Issuance Protection
    if (enrollment.certificate) {
      return {
        message: 'Certificate already issued.',
        certificate: {
          id: enrollment.certificate.id,
          verificationCode: enrollment.certificate.verificationCode,
          courseTitle: enrollment.course.title,
          studentName: user.fullName,
          instructorName: enrollment.course.author.fullName,
          institutionName: enrollment.course.institution?.name || 'EduVerse Academy',
          completionDate: enrollment.completedAt || enrollment.certificate.issuedAt,
          issuedAt: enrollment.certificate.issuedAt,
          isRevoked: enrollment.certificate.isRevoked,
        },
      };
    }

    // 2. Strict Eligibility Verification (100% progress required)
    if (enrollment.progressPercentage < 100 || !enrollment.completedAt) {
      throw new BadRequestException(
        `Cannot issue certificate: Course completion required (Current progress: ${enrollment.progressPercentage}%).`,
      );
    }

    // 3. Generate Non-guessable Verification Code
    const verificationCode = this.generateSecureVerificationCode();

    // 4. Atomic Database Transaction
    const newCertificate = await this.prisma.$transaction(async (tx) => {
      const cert = await tx.certificate.create({
        data: {
          verificationCode,
          enrollmentId: enrollment.id,
          userId,
          courseId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CERTIFICATE_GENERATED',
          entityType: 'Certificate',
          entityId: cert.id,
          metadata: {
            courseId,
            courseTitle: enrollment.course.title,
            verificationCode,
          },
        },
      });

      return cert;
    });

    // 5. Multi-Channel Notifications & Email Dispatch
    await this.notificationsService
      .dispatch({
        userId,
        type: NotificationType.CERTIFICATE,
        title: 'Certificate Awarded! 🎓',
        message: `Congratulations! Your official certificate for "${enrollment.course.title}" has been issued. Verification ID: ${verificationCode}`,
        actionUrl: `/app/certificates`,
        metadata: {
          certificateId: newCertificate.id,
          verificationCode,
          courseTitle: enrollment.course.title,
        },
        idempotencyKey: `cert:issue:${newCertificate.id}`,
      })
      .catch((err) =>
        this.logger.warn(`Failed to dispatch notification for certificate ${newCertificate.id}: ${err.message}`),
      );

    await this.mailService
      .sendCertificateIssued(user.email, enrollment.course.title, verificationCode)
      .catch((err) =>
        this.logger.warn(`Failed to send certificate email to ${user.email}: ${err.message}`),
      );

    return {
      message: 'Certificate successfully awarded!',
      certificate: {
        id: newCertificate.id,
        verificationCode: newCertificate.verificationCode,
        courseTitle: enrollment.course.title,
        studentName: user.fullName,
        instructorName: enrollment.course.author.fullName,
        institutionName: enrollment.course.institution?.name || 'EduVerse Academy',
        completionDate: enrollment.completedAt,
        issuedAt: newCertificate.issuedAt,
        isRevoked: false,
      },
    };
  }

  // -------------------------------------------------------------
  // 4. PUBLIC CERTIFICATE VERIFICATION (NO AUTH REQUIRED)
  // -------------------------------------------------------------

  async verifyPublic(verificationCode: string) {
    const normalizedCode = verificationCode.trim().toUpperCase();

    const cert = await this.prisma.certificate.findUnique({
      where: { verificationCode: normalizedCode },
      include: {
        user: { select: { fullName: true } },
        enrollment: { select: { completedAt: true } },
        course: {
          select: {
            title: true,
            slug: true,
            author: { select: { fullName: true } },
            institution: { select: { name: true, slug: true } },
          },
        },
      },
    });

    if (!cert) {
      return {
        isValid: false,
        status: 'NOT_FOUND',
        message: `No accredited certificate found with verification code "${normalizedCode}".`,
      };
    }

    if (cert.isRevoked) {
      return {
        isValid: false,
        status: 'REVOKED',
        message: 'This certificate was revoked by an institutional authority.',
        revokedAt: cert.revokedAt,
        revocationReason: cert.revocationReason,
        certificate: {
          id: cert.id,
          verificationCode: cert.verificationCode,
          courseTitle: cert.course.title,
          studentName: cert.user.fullName,
          instructorName: cert.course.author.fullName,
          institutionName: cert.course.institution?.name || 'EduVerse Academy',
          completionDate: cert.enrollment.completedAt || cert.issuedAt,
          issuedAt: cert.issuedAt,
        },
      };
    }

    return {
      isValid: true,
      status: 'VALID',
      message: 'Certificate verified and authentic.',
      certificate: {
        id: cert.id,
        verificationCode: cert.verificationCode,
        courseTitle: cert.course.title,
        courseSlug: cert.course.slug,
        studentName: cert.user.fullName,
        instructorName: cert.course.author.fullName,
        institutionName: cert.course.institution?.name || 'EduVerse Academy',
        completionDate: cert.enrollment.completedAt || cert.issuedAt,
        issuedAt: cert.issuedAt,
      },
    };
  }

  // -------------------------------------------------------------
  // 5. PDF CERTIFICATE DOWNLOAD
  // -------------------------------------------------------------

  async downloadPdf(identifier: string, _requestingUserId?: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: {
        OR: [{ id: identifier }, { verificationCode: identifier.toUpperCase().trim() }],
      },
      include: {
        user: { select: { id: true, fullName: true } },
        enrollment: { select: { completedAt: true } },
        course: {
          select: {
            title: true,
            author: { select: { fullName: true } },
            institution: { select: { name: true } },
          },
        },
      },
    });

    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }

    if (cert.isRevoked) {
      throw new BadRequestException('This certificate has been revoked and cannot be exported.');
    }

    const pdfData: CertificatePdfData = {
      id: cert.id,
      studentName: cert.user.fullName,
      courseTitle: cert.course.title,
      instructorName: cert.course.author.fullName,
      institutionName: cert.course.institution?.name || 'EduVerse Academy',
      completionDate: (cert.enrollment.completedAt || cert.issuedAt).toISOString().split('T')[0] || '',
      issuedAt: cert.issuedAt.toISOString().split('T')[0] || '',
      verificationCode: cert.verificationCode,
    };

    const buffer = generateCertificatePdf(pdfData);
    const filename = `Certificate-${cert.verificationCode}.pdf`;

    return {
      buffer,
      filename,
      verificationCode: cert.verificationCode,
    };
  }

  // -------------------------------------------------------------
  // 6. REVOCATION (ADMINISTRATIVE ONLY)
  // -------------------------------------------------------------

  async revokeCertificate(adminUserId: string, certificateId: string, reason: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { course: true, user: true },
    });

    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }

    const updated = await this.prisma.certificate.update({
      where: { id: certificateId },
      data: {
        isRevoked: true,
        revocationReason: reason.trim(),
        revokedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CERTIFICATE_REVOKED',
        entityType: 'Certificate',
        entityId: certificateId,
        metadata: {
          verificationCode: cert.verificationCode,
          targetUserId: cert.userId,
          reason,
        },
      },
    });

    return updated;
  }
}
