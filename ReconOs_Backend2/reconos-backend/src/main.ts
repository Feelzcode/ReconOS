// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalFilters(new PrismaExceptionFilter());

  // Global validation pipe — strips unknown fields, validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const corsOrigins = new Set([
    frontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3003',
    'http://127.0.0.1:3003',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        corsOrigins.has(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 ReconOs backend running on http://localhost:${port}/api`);
  console.log(`📊 Mock Nomba: ${process.env.USE_MOCK_NOMBA === 'true' ? 'ON' : 'OFF'}`);
}
bootstrap();
