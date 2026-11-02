import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCertificates(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
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
      institutionName: cert.course.institution?.name || 'EduVerse Academy',
      issuedAt: cert.issuedAt,
    }));
  }
}

