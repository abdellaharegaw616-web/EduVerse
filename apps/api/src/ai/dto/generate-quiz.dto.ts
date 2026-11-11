import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDifficulty } from '../../database/prisma.service';

export class GenerateQuizDto {
  @ApiProperty({ description: 'Target lesson ID to extract quiz questions from' })
  @IsUUID()
  lessonId!: string;

  @ApiPropertyOptional({ example: 4, default: 4, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  questionCount?: number = 4;

  @ApiPropertyOptional({ enum: CourseDifficulty, default: CourseDifficulty.INTERMEDIATE })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty = CourseDifficulty.INTERMEDIATE;
}

