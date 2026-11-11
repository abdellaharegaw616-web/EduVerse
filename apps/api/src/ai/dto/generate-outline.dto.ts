import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDifficulty } from '../../database/prisma.service';

export class GenerateOutlineDto {
  @ApiProperty({ example: 'Distributed Systems and Cloud Engineering with NestJS' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  topic!: string;

  @ApiPropertyOptional({ enum: CourseDifficulty, default: CourseDifficulty.INTERMEDIATE })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty = CourseDifficulty.INTERMEDIATE;

  @ApiPropertyOptional({ example: 4, default: 4, minimum: 2, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(8)
  sectionCount?: number = 4;
}

