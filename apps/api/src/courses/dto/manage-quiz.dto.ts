import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../../database/prisma.service';

export class UpsertQuizDto {
  @ApiProperty({ example: 'Module 1 Knowledge Check' })
  @IsString()
  @IsNotEmpty({ message: 'Quiz title is required' })
  title!: string;

  @ApiPropertyOptional({ example: 75, default: 70 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ example: 30, default: 30, description: 'Time limit in minutes (null for unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ example: 3, default: 3, description: 'Maximum allowed quiz attempts' })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptLimit?: number;
}

export class QuestionOptionDto {
  @ApiProperty({ example: 'TypeScript compiles to plain JavaScript' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is the primary benefit of TypeScript strict null checks?' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({ enum: QuestionType, default: QuestionType.MULTIPLE_CHOICE })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ example: 5, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiProperty({ type: [QuestionOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];
}

