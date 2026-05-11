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
    let url = this.config.get('AI_SERVICE_URL') || 'http://clinova-ai:10000';
    if (url && !url.startsWith('http')) {
      url = `http://${url}`;
    }
    // Render internal hostnames don't include the port, but services listen on 10000
    if (url && !url.includes(':', 6)) { 
      url = `${url}:10000`;
    }
    return url;
  }

  async proxyToAiService(endpoint: string, body: any) {
    try {
      const res = await axios.post(`${this.aiServiceUrl}/api/ai/${endpoint}`, body, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' },
      });
      return res.data;
    } catch (e: any) {
      console.error('AI Proxy Error:', e.response?.data || e.message);
      const detail = e.response?.data?.detail || e.message;
      throw new Error(`AI service error: ${detail}`);
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
