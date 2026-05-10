import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import axios from 'axios';

@ApiTags('records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('records')
export class RecordsController {
  constructor(private config: ConfigService) {}

  private get fhirUrl() {
    return this.config.get('FHIR_SERVICE_URL') || 'http://fhir-service:8002';
  }

  @Get('Patient/:id')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Get FHIR Patient resource' })
  async getPatient(@Param('id') id: string) {
    const res = await axios.get(`${this.fhirUrl}/fhir/R4/Patient/${id}`);
    return res.data;
  }

  @Post('Patient')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Create FHIR Patient resource' })
  async createPatient(@Body() body: any) {
    const res = await axios.post(`${this.fhirUrl}/fhir/R4/Patient`, body);
    return res.data;
  }

  @Get('Observation')
  @Roles('DOCTOR', 'ADMIN', 'NURSE')
  @ApiOperation({ summary: 'List FHIR Observations' })
  async listObservations(@Query('patient') patient?: string) {
    const res = await axios.get(`${this.fhirUrl}/fhir/R4/Observation`, { params: { patient } });
    return res.data;
  }

  @Post('Observation')
  @Roles('DOCTOR', 'NURSE')
  @ApiOperation({ summary: 'Create FHIR Observation' })
  async createObservation(@Body() body: any) {
    const res = await axios.post(`${this.fhirUrl}/fhir/R4/Observation`, body);
    return res.data;
  }

  @Post('$process-hl7')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({ summary: 'Ingest HL7 v2 message and convert to FHIR' })
  async processHl7(@Body() body: { message: string }) {
    const res = await axios.post(`${this.fhirUrl}/fhir/R4/Patient/$process-message`, body);
    return res.data;
  }
}
