import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { RecordsModule } from './records/records.module';
import { AiModule } from './ai/ai.module';
import { VoiceModule } from './voice/voice.module';
import { KafkaModule } from './kafka/kafka.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Rate Limiting (ISO 27001 compliance) ─────────────────
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },  // 100 req/min global
    ]),

    // ── Core ─────────────────────────────────────────────────
    PrismaModule,
    KafkaModule,

    // ── Feature Modules ───────────────────────────────────────
    AuthModule,
    PatientsModule,
    AppointmentsModule,
    RecordsModule,
    AiModule,
    VoiceModule,
  ],
})
export class AppModule {}
