import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to PostgreSQL database successfully.');
    } catch (error) {
      this.logger.warn(
        `Prisma could not connect immediately to database: ${(error as Error).message}. Continuing in offline/degraded mode.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from PostgreSQL database.');
  }

  async checkHealth(): Promise<{ isHealthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.$queryRawUnsafe('SELECT 1');
      return {
        isHealthy: true,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        isHealthy: false,
        error: (err as Error).message,
      };
    }
  }
}

