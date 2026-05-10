import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async create(dto: any, currentUser: any) {
    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
        isTelemedicine: dto.isTelemedicine || false,
      },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true } } } },
        doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async findForUser(user: any, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    if (user.role === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({ where: { userId: user.sub } });
      if (patient) where.patientId = patient.id;
    } else if (user.role === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.sub } });
      if (doctor) where.doctorId = doctor.id;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async update(id: string, dto: any) {
    return this.prisma.appointment.update({
      where: { id },
      data: { ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.appointment.update({ where: { id }, data: { status: status as any } });
  }

  async cancel(id: string) {
    return this.prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async createLiveKitRoom(appointmentId: string) {
    const appt = await this.findOne(appointmentId);
    const voiceUrl = this.config.get('VOICE_SERVICE_URL') || 'http://voice-service:8003';
    try {
      const res = await axios.post(`${voiceUrl}/api/voice/rooms/create`, {
        patient_id: appt.patientId,
        doctor_id: appt.doctorId,
        appointment_id: appointmentId,
        room_name: `appt-${appointmentId}`,
      });
      // Store room ID on appointment
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { liveKitRoomId: res.data.room_name },
      });
      return res.data;
    } catch (e) {
      throw new Error(`Failed to create LiveKit room: ${e.message}`);
    }
  }
}
