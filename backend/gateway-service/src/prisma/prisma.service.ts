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
    await this.$connect();
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
