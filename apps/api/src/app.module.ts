import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { CertificatesModule } from './certificates/certificates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { NotesModule } from './notes/notes.module';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: ['.env', 'apps/api/.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl', 60),
          limit: config.get<number>('throttle.limit', 100),
        },
      ],
    }),
    PrismaModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    InstitutionsModule,
    CoursesModule,
    LessonsModule,
    EnrollmentsModule,
    AssessmentsModule,
    AssignmentsModule,
    CertificatesModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
    AiModule,
    NotesModule,
    AnnouncementsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

