import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserAdminDto {
  @ApiProperty({
    example: false,
    description: 'Target account status: false = suspended, true = active',
  })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({
    example: 'Violating terms of service (academic dishonesty)',
    description: 'Mandatory or explanatory reason for suspension or reactivation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
