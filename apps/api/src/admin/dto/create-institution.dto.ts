import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInstitutionDto {
  @ApiProperty({ example: 'Addis Ababa University' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'aau' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional({ example: 'aau.edu.et' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @ApiProperty({ example: 'admin@aau.edu.et' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ example: 'https://www.aau.edu.et' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

