import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  // Fail fast in production if JWT_SECRET is missing or too short.
  // A weak secret allows any attacker to forge valid tokens.
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET ?? '';
    if (secret.length < 64) {
      console.error(
        '\n[STARTUP] FATAL: JWT_SECRET must be at least 64 characters in production.\n' +
        '         Generate one with:  openssl rand -base64 64\n',
      );
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Elaji Health API')
    .setDescription('Elaji Health Platform — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  console.log(`\n🏥 Elaji Health API running on: http://localhost:${port}/api`);
  console.log(`📖 API Docs:             http://localhost:${port}/api/docs\n`);
}

bootstrap();
