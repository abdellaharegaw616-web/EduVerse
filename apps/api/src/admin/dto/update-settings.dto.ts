import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'EduVerse - Learn Beyond Boundaries' })
  @IsOptional()
  @IsString()
  platformName?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowRegistration?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether instructor courses require administrative moderation before catalog publication' })
  @IsOptional()
  @IsBoolean()
  requireCourseApproval?: boolean;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(500)
  maxUploadSizeMb?: number;

  @ApiPropertyOptional({ example: 'support@eduverse.et' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional({ example: 'Africa/Addis_Ababa' })
  @IsOptional()
  @IsString()
  defaultTimezone?: string;
}
