import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificates.service';
import { PrismaService } from '../database/prisma.service';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let prisma: any;

  const studentA = 'student-uuid-aaa';

  beforeEach(async () => {
    prisma = {
      certificate: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
  });

  describe('getMyCertificates', () => {
    it('should retrieve student earned certificates with verification codes', async () => {
      const mockCerts = [
        {
          id: 'cert-1',
          verificationCode: 'EV-AAU-2026-9941',
          issuedAt: new Date(),
          course: {
            id: 'course-1',
            title: 'Modern Full-Stack Engineering',
            slug: 'modern-fullstack',
            institution: { name: 'Addis Ababa University', slug: 'aau' },
          },
        },
      ];

      prisma.certificate.findMany.mockResolvedValue(mockCerts);

      const results = await service.getMyCertificates(studentA);

      expect(prisma.certificate.findMany).toHaveBeenCalledWith({
        where: { userId: studentA },
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

      expect(results).toHaveLength(1);
      expect(results[0]?.verificationCode).toBe('EV-AAU-2026-9941');
      expect(results[0]?.institutionName).toBe('Addis Ababa University');
    });
  });
});

