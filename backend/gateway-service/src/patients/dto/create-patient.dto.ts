import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';
export class CreatePatientDto {
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() bloodType?: string;
  @IsOptional() @IsArray() allergies?: string[];
}
export class UpdatePatientDto extends CreatePatientDto {}
