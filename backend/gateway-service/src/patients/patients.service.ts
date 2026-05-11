import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private get fhirUrl() {
    let url = this.config.get('FHIR_SERVICE_URL') || 'http://clinova-fhir:10000';
    if (url && !url.startsWith('http')) {
      url = `http://${url}`;
    }
    if (url && !url.includes(':', 6)) { 
      url = `${url}:10000`;
    }
    return url;
  }

  async findAll({ search, page, limit }: { search?: string; page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const where: any = { user: { deletedAt: null } };
    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        include: { 
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          contactEmails: true 
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { 
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, lastLoginAt: true } },
        contactEmails: true
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async findByUserId(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: { 
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        contactEmails: true
      },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');
    return patient;
  }

  async update(patientId: string, dto: any, currentUser: any) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (currentUser.role === 'PATIENT' && patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Cannot update another patient profile');
    }
    return this.prisma.patient.update({ where: { id: patientId }, data: dto });
  }

  async softDelete(patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    await this.prisma.user.update({
      where: { id: patient.userId },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Patient data deleted (GDPR compliance)' };
  }

  async getPatientAppointments(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getFhirRecords(patientId: string) {
    const patient = await this.findOne(patientId);
    if (!patient.fhirPatientId) return { resources: [] };
    try {
      const res = await axios.get(`${this.fhirUrl}/fhir/R4/Patient/${patient.fhirPatientId}`);
      return res.data;
    } catch {
      return { message: 'FHIR records not available' };
    }
  }

  async getAiSessions(patientId: string) {
    const patient = await this.findOne(patientId);
    return this.prisma.aISession.findMany({
      where: { userId: patient.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
