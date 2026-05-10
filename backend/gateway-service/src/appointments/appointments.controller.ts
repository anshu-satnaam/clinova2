import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a new appointment' })
  create(@Body() dto: CreateAppointmentDto, @Request() req) {
    return this.appointmentsService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments for current user' })
  findAll(@Request() req, @Query('status') status?: string) {
    return this.appointmentsService.findForUser(req.user, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update appointment details' })
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update appointment status (confirm, complete, cancel)' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.appointmentsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel appointment' })
  cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @Post(':id/livekit-room')
  @ApiOperation({ summary: 'Create LiveKit room for telemedicine appointment' })
  createRoom(@Param('id') id: string) {
    return this.appointmentsService.createLiveKitRoom(id);
  }
}
