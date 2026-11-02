import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:3000');
  const environment = configService.get<string>('environment', 'development');

  // 1. Cookie Parser
  app.use(cookieParser());

  // 2. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: environment === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. CORS Configuration
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        origin === frontendUrl ||
        (environment !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // 3. Global API Route Prefix (/api/v1)
  app.setGlobalPrefix('api/v1');

  // 4. Global Input Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 5. OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduVerse API')
    .setDescription('EduVerse SaaS Platform — Core Backend REST API Documentation')
    .setVersion('1.0.0')
    .addTag('System & Health')
    .addTag('Authentication')
    .addTag('Courses & Curriculum')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  // 6. Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // 7. Start HTTP Server
  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(`🚀 EduVerse API Server running on: http://localhost:${port}/api/v1`);
  logger.log(`📑 OpenAPI / Swagger UI available at: http://localhost:${port}/api/docs`);
  logger.log(`🛡️  Environment: ${environment}`);
  logger.log(`=======================================================`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during application startup:', err);
  process.exit(1);
});
