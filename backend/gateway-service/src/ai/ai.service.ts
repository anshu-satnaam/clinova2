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
    let url = this.config.get('AI_SERVICE_URL') || 'https://clinova-ai.onrender.com';
    if (url && !url.startsWith('http')) {
      url = url.includes('onrender.com') ? `https://${url}` : `http://${url}:10000`;
    }
    return url;
  }

  private get fhirUrl() {
    let url = this.config.get('FHIR_SERVICE_URL') || 'https://clinova-fhir.onrender.com';
    if (url && !url.startsWith('http')) {
      url = url.includes('onrender.com') ? `https://${url}` : `http://${url}:10000`;
    }
    return url;
  }

  private get voiceUrl() {
    let url = this.config.get('VOICE_SERVICE_URL') || 'https://clinova-voice.onrender.com';
    if (url && !url.startsWith('http')) {
      url = url.includes('onrender.com') ? `https://${url}` : `http://${url}:10000`;
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
