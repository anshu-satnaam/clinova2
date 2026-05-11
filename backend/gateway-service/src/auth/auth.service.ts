import {
  Injectable, UnauthorizedException,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    let authEmail = dto.email;
    
    // If registering a PATIENT, we allow them to share an email address by generating a unique User auth email
    // and storing the provided email purely for contact/notification purposes.
    if (dto.role === 'PATIENT') {
      authEmail = `patient_${uuidv4().slice(0, 8)}@system.local`;
    } else {
      const existing = await this.prisma.user.findUnique({ where: { email: authEmail } });
      if (existing) throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: authEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || 'PATIENT',
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true },
    });

    // Create profile based on role
    if (user.role === 'PATIENT') {
      await this.prisma.patient.create({ 
        data: { 
          userId: user.id,
          gender: dto.gender,
          bloodType: dto.bloodType,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          allergies: dto.allergies || [],
          contactEmails: dto.email ? {
            create: { email: dto.email }
          } : undefined,
        } 
      });
    } else if (user.role === 'DOCTOR') {
      await this.prisma.doctor.create({
        data: {
          userId: user.id,
          licenseNumber: dto.licenseNumber || `LIC-${uuidv4().slice(0, 8).toUpperCase()}`,
          specialization: dto.specialization || 'General',
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  // ── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    // Update last login (HIPAA audit)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resource: 'auth',
        metadata: { email: user.email },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName,
      },
      ...tokens,
    };
  }

  // ── Refresh Token ───────────────────────────────────────────────────────────

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    // Rotate refresh token
    await this.prisma.refreshToken.update({ where: { token }, data: { isRevoked: true } });
    return this.generateTokens(user.id, user.email, user.role);
  }

  // ── Logout ──────────────────────────────────────────────────────────────────

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  // ── Get Me ──────────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, phone: true,
        isActive: true, mfaEnabled: true, lastLoginAt: true, createdAt: true,
        patientProfile: true,
        doctorProfile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: any) {
    const { firstName, lastName, phone, doctorProfile, patientProfile } = dto;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
        ...(doctorProfile && {
          doctorProfile: {
            update: doctorProfile,
          },
        }),
        ...(patientProfile && {
          patientProfile: {
            update: patientProfile,
          },
        }),
      },
      include: { doctorProfile: true, patientProfile: true },
    });
  }

  // ── Consent Record (DPDP / GDPR) ────────────────────────────────────────────

  async recordConsent(userId: string, consentType: string, granted: boolean) {
    return this.prisma.consentRecord.create({
      data: {
        userId,
        consentType,
        status: granted ? 'GRANTED' : 'REVOKED',
        grantedAt: granted ? new Date() : undefined,
        revokedAt: granted ? undefined : new Date(),
      },
    });
  }

  // ── Token Generation ─────────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Persist refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });

    return { accessToken, refreshToken };
  }
}
