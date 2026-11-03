import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInstitutionProfileDto {
  @ApiPropertyOptional({ example: 'Addis Ababa University' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'admin@aau.edu.et' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'https://www.aau.edu.et' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;
}
