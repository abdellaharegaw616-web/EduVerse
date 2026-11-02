import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({ example: false, description: 'Set to false to suspend account, true to reactivate' })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'Violation of institutional academic integrity guidelines' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

