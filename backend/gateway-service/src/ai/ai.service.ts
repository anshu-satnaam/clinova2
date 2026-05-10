import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class AiService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private get aiServiceUrl() {
    return this.config.get('AI_SERVICE_URL') || 'http://ai-service:8001';
  }

  async proxyToAiService(endpoint: string, body: any) {
    try {
      const res = await axios.post(`${this.aiServiceUrl}/api/ai/${endpoint}`, body, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' },
      });
      return res.data;
    } catch (e) {
      throw new Error(`AI service error: ${e.response?.data?.detail || e.message}`);
    }
  }

  async approveAiSession(sessionId: string, doctorUserId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId: doctorUserId } });
    return this.prisma.aISession.update({
      where: { id: sessionId },
      data: {
        doctorApproved: true,
        safetyStatus: 'APPROVED',
        doctorId: doctor?.id,
      },
    });
  }
}
