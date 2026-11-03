import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('CertificatesService (Phase 8H: Certificate Generation & Verification)', () => {
  let service: CertificatesService;
  let prisma: any;
  let mailService: any;
  let notificationsService: any;

  const mockActiveStudent = {
    id: 'student-1',
    email: 'student@aau.edu.et',
    fullName: 'Abebe Bikila',
    isActive: true,
  };

  const mockSuspendedStudent = {
    id: 'suspended-1',
    email: 'suspended@aau.edu.et',
    fullName: 'Suspended User',
    isActive: false,
  };

  const mockCourse = {
    id: 'course-1',
    title: 'Cloud Architecture & Distributed Systems',
    slug: 'cloud-architecture',
    author: { fullName: 'Dr. Kebede Wolde' },
    institution: { name: 'Addis Ababa University', slug: 'aau' },
  };

  const mockCompletedEnrollment = {
    id: 'enr-completed',
    userId: 'student-1',
    courseId: 'course-1',
    progressPercentage: 100,
    completedAt: new Date('2026-03-01T12:00:00Z'),
    certificate: null,
    course: mockCourse,
  };

  const mockIncompleteEnrollment = {
    id: 'enr-incomplete',
    userId: 'student-1',
    courseId: 'course-1',
    progressPercentage: 65,
    completedAt: null,
    certificate: null,
    course: mockCourse,
  };

  beforeEach(async () => {
    prisma = {
      certificate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    mailService = {
      sendCertificateIssued: jest.fn().mockResolvedValue({ success: true }),
    };

    notificationsService = {
      dispatch: jest.fn().mockResolvedValue({ inAppDelivered: true, emailDelivered: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
  });

  describe('1. Eligibility Verification', () => {
    it('should return eligible: false if user is not enrolled in the course', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);

      const res = await service.checkEligibility('student-1', 'course-1');

      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('not enrolled');
    });

    it('should return eligible: false if course is not 100% completed', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockIncompleteEnrollment);

      const res = await service.checkEligibility('student-1', 'course-1');

      expect(res.eligible).toBe(false);
      expect(res.progressPercentage).toBe(65);
      expect(res.reason).toContain('100% completion required');
    });

    it('should return eligible: true when course progress reaches 100% with completedAt timestamp', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(mockCompletedEnrollment);

      const res = await service.checkEligibility('student-1', 'course-1');

      expect(res.eligible).toBe(true);
      expect(res.progressPercentage).toBe(100);
      expect(res.completedAt).toBeDefined();
    });

    it('should report alreadyIssued: true if a certificate already exists for this enrollment', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({
        ...mockCompletedEnrollment,
        certificate: {
          id: 'cert-existing-1',
          verificationCode: 'EV-2026-ABCD1234EF567890',
          issuedAt: new Date(),
        },
      });

      const res = await service.checkEligibility('student-1', 'course-1');

      expect(res.eligible).toBe(false);
      expect(res.alreadyIssued).toBe(true);
      expect(res.certificate?.verificationCode).toBe('EV-2026-ABCD1234EF567890');
    });
  });

  describe('2. Certificate Generation & Security Guards', () => {
    it('should reject claim if student account is suspended or inactive (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockSuspendedStudent);

      await expect(
        service.claimCertificate('suspended-1', 'course-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject claim if student is not enrolled (404 Not Found)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.claimCertificate('student-1', 'course-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject claim if course progress is below 100% (400 Bad Request)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.enrollment.findUnique.mockResolvedValue(mockIncompleteEnrollment);

      await expect(
        service.claimCertificate('student-1', 'course-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should award certificate, write audit log, dispatch notification, and send email when eligible', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.enrollment.findUnique.mockResolvedValue(mockCompletedEnrollment);

      const mockCreatedCert = {
        id: 'new-cert-uuid',
        verificationCode: 'EV-2026-1122334455667788',
        enrollmentId: 'enr-completed',
        userId: 'student-1',
        courseId: 'course-1',
        issuedAt: new Date(),
        isRevoked: false,
      };
      prisma.certificate.create.mockResolvedValue(mockCreatedCert);

      const res = await service.claimCertificate('student-1', 'course-1');

      expect(res.message).toContain('successfully awarded');
      expect(res.certificate.verificationCode).toBe('EV-2026-1122334455667788');
      expect(res.certificate.studentName).toBe('Abebe Bikila');
      expect(res.certificate.courseTitle).toBe(mockCourse.title);
      expect(prisma.certificate.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CERTIFICATE_GENERATED',
            entityType: 'Certificate',
          }),
        }),
      );
      expect(notificationsService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'student-1',
          type: 'CERTIFICATE',
        }),
      );
      expect(mailService.sendCertificateIssued).toHaveBeenCalledWith(
        'student@aau.edu.et',
        mockCourse.title,
        expect.any(String),
      );
    });

    it('should prevent duplicate issuance and return existing certificate idempotently', async () => {
      prisma.user.findUnique.mockResolvedValue(mockActiveStudent);
      prisma.enrollment.findUnique.mockResolvedValue({
        ...mockCompletedEnrollment,
        certificate: {
          id: 'existing-cert-id',
          verificationCode: 'EV-2026-ALREADYISSUED',
          issuedAt: new Date(),
          isRevoked: false,
        },
      });

      const res = await service.claimCertificate('student-1', 'course-1');

      expect(res.message).toContain('already issued');
      expect(res.certificate.id).toBe('existing-cert-id');
      expect(res.certificate.verificationCode).toBe('EV-2026-ALREADYISSUED');
      expect(prisma.certificate.create).not.toHaveBeenCalled(); // No duplicate record
    });
  });

  describe('3. Public Certificate Verification', () => {
    it('should verify authentic valid certificate publicly without authentication', async () => {
      const mockRecord = {
        id: 'cert-1',
        verificationCode: 'EV-2026-9988776655443322',
        isRevoked: false,
        issuedAt: new Date(),
        user: { fullName: 'Abebe Bikila' },
        enrollment: { completedAt: new Date('2026-02-15') },
        course: mockCourse,
      };
      prisma.certificate.findUnique.mockResolvedValue(mockRecord);

      const res = await service.verifyPublic('EV-2026-9988776655443322');

      expect(res.isValid).toBe(true);
      expect(res.status).toBe('VALID');
      expect(res.certificate?.studentName).toBe('Abebe Bikila');
      expect(res.certificate?.courseTitle).toBe(mockCourse.title);
      expect(res.certificate?.institutionName).toBe('Addis Ababa University');
    });

    it('should normalize input and handle case-insensitivity on verification code', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert-1',
        verificationCode: 'EV-2026-AABBCCDD',
        isRevoked: false,
        issuedAt: new Date(),
        user: { fullName: 'Abebe Bikila' },
        enrollment: { completedAt: new Date() },
        course: mockCourse,
      });

      await service.verifyPublic('  ev-2026-aabbccdd  ');

      expect(prisma.certificate.findUnique).toHaveBeenCalledWith({
        where: { verificationCode: 'EV-2026-AABBCCDD' },
        include: expect.any(Object),
      });
    });

    it('should return status NOT_FOUND when verification code does not exist', async () => {
      prisma.certificate.findUnique.mockResolvedValue(null);

      const res = await service.verifyPublic('EV-INVALID-CODE-999');

      expect(res.isValid).toBe(false);
      expect(res.status).toBe('NOT_FOUND');
      expect(res.message).toContain('No accredited certificate found');
    });

    it('should report status REVOKED with revocation details if certificate was revoked', async () => {
      const revokedCert = {
        id: 'cert-revoked-1',
        verificationCode: 'EV-2026-REVOKEDCODE',
        isRevoked: true,
        revocationReason: 'Academic misconduct detected during audit',
        revokedAt: new Date('2026-03-05'),
        issuedAt: new Date('2026-02-01'),
        user: { fullName: 'Student Dishonest' },
        enrollment: { completedAt: new Date('2026-02-01') },
        course: mockCourse,
      };
      prisma.certificate.findUnique.mockResolvedValue(revokedCert);

      const res = await service.verifyPublic('EV-2026-REVOKEDCODE');

      expect(res.isValid).toBe(false);
      expect(res.status).toBe('REVOKED');
      expect(res.revocationReason).toBe('Academic misconduct detected during audit');
      expect(res.revokedAt).toBeDefined();
    });
  });

  describe('4. PDF Generation & Export', () => {
    it('should generate valid PDF buffer for authentic certificate', async () => {
      prisma.certificate.findFirst.mockResolvedValue({
        id: 'cert-1',
        verificationCode: 'EV-2026-PDF-TEST',
        isRevoked: false,
        issuedAt: new Date(),
        user: { id: 'u-1', fullName: 'Abebe Bikila' },
        enrollment: { completedAt: new Date() },
        course: mockCourse,
      });

      const { buffer, filename } = await service.downloadPdf('EV-2026-PDF-TEST');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString('utf-8', 0, 8)).toBe('%PDF-1.4');
      expect(filename).toBe('Certificate-EV-2026-PDF-TEST.pdf');
    });

    it('should reject PDF export if certificate has been revoked', async () => {
      prisma.certificate.findFirst.mockResolvedValue({
        id: 'cert-revoked',
        verificationCode: 'EV-2026-REVOKED-PDF',
        isRevoked: true,
      });

      await expect(
        service.downloadPdf('EV-2026-REVOKED-PDF'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if certificate identifier does not exist', async () => {
      prisma.certificate.findFirst.mockResolvedValue(null);

      await expect(service.downloadPdf('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('5. Administrative Revocation', () => {
    it('should allow administrator to revoke certificate and log audit trail', async () => {
      prisma.certificate.findUnique.mockResolvedValue({
        id: 'cert-1',
        verificationCode: 'EV-2026-REVOKE-ME',
        userId: 'student-1',
        course: mockCourse,
        user: mockActiveStudent,
      });
      prisma.certificate.update.mockResolvedValue({
        id: 'cert-1',
        isRevoked: true,
        revocationReason: 'Chargeback issued for course tuition',
      });

      const res = await service.revokeCertificate(
        'admin-1',
        'cert-1',
        'Chargeback issued for course tuition',
      );

      expect(res.isRevoked).toBe(true);
      expect(prisma.certificate.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: expect.objectContaining({
          isRevoked: true,
          revocationReason: 'Chargeback issued for course tuition',
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CERTIFICATE_REVOKED',
            entityType: 'Certificate',
          }),
        }),
      );
    });
  });
});
