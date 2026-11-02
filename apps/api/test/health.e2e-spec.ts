import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockPrisma = {
      $connect: jest.fn().mockResolvedValue(true),
      $disconnect: jest.fn().mockResolvedValue(true),
      checkHealth: jest.fn().mockResolvedValue({ isHealthy: true, latencyMs: 2 }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health should respond with 200 OK and valid health payload', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(['ok', 'degraded']).toContain(response.body.status);
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptimeSeconds');
    expect(response.body).toHaveProperty('memory');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('database');
  });
});

