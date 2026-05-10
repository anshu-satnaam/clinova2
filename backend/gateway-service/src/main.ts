import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security ──────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.use(morgan('combined'));

  // ── CORS ─────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Global Validation ─────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Swagger / OpenAPI ─────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Clinova Healthcare AI Platform')
    .setDescription(
      'API Gateway for Clinova — AI-powered healthcare platform. ' +
      'Includes auth, patient management, FHIR records, AI workflows, and voice AI.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & authorization')
    .addTag('patients', 'Patient management')
    .addTag('appointments', 'Appointment scheduling')
    .addTag('records', 'FHIR medical records')
    .addTag('ai', 'AI clinical workflows')
    .addTag('voice', 'Voice AI pipeline')
    .addTag('audit', 'Audit logs')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ── Start ─────────────────────────────────────────────────
  const port = process.env.GATEWAY_PORT || 3000;
  await app.listen(port);
  console.log(`🏥 Clinova Gateway running on port ${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
