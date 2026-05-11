import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuditLogInterceptor } from './audit/audit-log.interceptor';
import { PrismaService } from './prisma/prisma.service';
import helmet from 'helmet';
import * as compression from 'compression';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const prismaService = app.get(PrismaService);
  app.useGlobalInterceptors(new AuditLogInterceptor(prismaService));

  // ── Security ──────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.use(morgan('combined'));

  // ── CORS ─────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:3001', 'http://localhost:3000'] : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Health endpoint for Docker ────────────────────────────
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.json({ status: 'healthy', service: 'clinova-gateway', version: '1.0.0', timestamp: new Date().toISOString() });
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
  const port = process.env.PORT || process.env.GATEWAY_PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🏥 Clinova Gateway running on port ${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
