import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    console.log('🔌 Connecting to database...');
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed during startup!');
      console.error(error);
      // In production, we want to know immediately if DB is down
      throw error; 
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDb() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDb() cannot be run in production');
    }
    return this.$transaction([
      this.auditLog.deleteMany(),
      this.consentRecord.deleteMany(),
      this.voiceSession.deleteMany(),
      this.aISession.deleteMany(),
      this.appointment.deleteMany(),
      this.fhirResource.deleteMany(),
      this.refreshToken.deleteMany(),
      this.patient.deleteMany(),
      this.doctor.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
