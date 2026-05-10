import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Roles('DOCTOR', 'ADMIN', 'NURSE')
  @ApiOperation({ summary: 'List all patients (Doctor/Admin only)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.patientsService.findAll({ search, page: +page, limit: +limit });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own patient profile' })
  getMyProfile(@Request() req) {
    return this.patientsService.findByUserId(req.user.sub);
  }

  @Get(':id')
  @Roles('DOCTOR', 'ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get patient by ID' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update patient profile' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Request() req) {
    return this.patientsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete patient (GDPR right to erasure)' })
  remove(@Param('id') id: string) {
    return this.patientsService.softDelete(id);
  }

  @Get(':id/appointments')
  @ApiOperation({ summary: 'Get patient appointments' })
  getAppointments(@Param('id') id: string) {
    return this.patientsService.getPatientAppointments(id);
  }

  @Get(':id/fhir')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Get patient FHIR records' })
  getFhirRecords(@Param('id') id: string) {
    return this.patientsService.getFhirRecords(id);
  }

  @Get(':id/ai-sessions')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Get patient AI session history (ISO 42001)' })
  getAiSessions(@Param('id') id: string) {
    return this.patientsService.getAiSessions(id);
  }
}
