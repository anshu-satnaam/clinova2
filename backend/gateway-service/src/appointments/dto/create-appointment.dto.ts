import { IsString, IsDateString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty() @IsUUID() doctorId: string;
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() isTelemedicine?: boolean;
}

export class UpdateAppointmentDto {
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isTelemedicine?: boolean;
}
