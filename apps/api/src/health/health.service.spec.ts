import { HealthService } from './health.service';
import { PrismaService } from '../database/prisma.service';

describe('HealthService (Unit)', () => {
  let healthService: HealthService;
  let mockPrismaService: Partial<PrismaService>;

  beforeEach(() => {
    mockPrismaService = {
      checkHealth: jest.fn().mockResolvedValue({
        isHealthy: true,
        latencyMs: 12,
      }),
    };

    healthService = new HealthService(mockPrismaService as PrismaService);
  });

  it('should return status "ok" when database is healthy', async () => {
    const result = await healthService.checkHealth();

    expect(result.status).toBe('ok');
    expect(result.services.database.status).toBe('up');
    expect(result.services.database.latencyMs).toBe(12);
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result.memory.heapUsedMB).toBeGreaterThan(0);
  });

  it('should return status "degraded" when database is unreachable', async () => {
    mockPrismaService.checkHealth = jest.fn().mockResolvedValue({
      isHealthy: false,
      error: 'Connection timeout to PostgreSQL',
    });

    const result = await healthService.checkHealth();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('down');
    expect(result.services.database.error).toBe('Connection timeout to PostgreSQL');
  });
});

