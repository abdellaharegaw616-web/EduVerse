import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuizAnswerItemDto {
  @ApiProperty({ example: 'q-uuid-1', description: 'Question ID being answered' })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiPropertyOptional({ example: 'opt-uuid-1', description: 'Selected option ID for multiple choice / true-false' })
  @IsOptional()
  @IsString()
  selectedOptionId?: string;

  @ApiPropertyOptional({ example: 'Addis Ababa', description: 'Text response for short-answer questions' })
  @IsOptional()
  @IsString()
  textAnswer?: string;
}

export class SubmitQuizDto {
  @ApiProperty({ type: [QuizAnswerItemDto], description: 'Student answers' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  answers!: QuizAnswerItemDto[];

  @ApiPropertyOptional({ example: '2026-11-03T12:00:00.000Z', description: 'Timestamp when the student opened the quiz session' })
  @IsOptional()
  @IsString()
  startedAt?: string;
}

