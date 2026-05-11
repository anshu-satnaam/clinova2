import { IsEmail, IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole { PATIENT = 'PATIENT', DOCTOR = 'DOCTOR', ADMIN = 'ADMIN' }

export class RegisterDto {
  @ApiProperty({ example: 'doctor@clinova.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.PATIENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false, description: 'Required for DOCTOR role' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ required: false, description: 'Required for DOCTOR role' })
  @IsOptional()
  @IsString()
  specialization?: string;

  // Patient Fields
  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  allergies?: string[];
}
