import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AiTutorMode {
  TUTOR = 'TUTOR',
  SUMMARY = 'SUMMARY',
  FLASHCARDS = 'FLASHCARDS',
  EXPLAIN_SIMPLE = 'EXPLAIN_SIMPLE',
}

export enum AiTutorLanguage {
  EN = 'en',
  AM = 'am',
  BILINGUAL = 'bilingual',
}

export class AskTutorDto {
  @ApiProperty({ example: 'Can you summarize the main architectural patterns in this lesson?' })
  @IsString()
  @IsNotEmpty({ message: 'Question or prompt is required' })
  @MinLength(2)
  @MaxLength(2000)
  question!: string;

  @ApiPropertyOptional({ description: 'Optional course ID for syllabus context' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Optional lesson ID for granular lesson context' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({ enum: AiTutorMode, default: AiTutorMode.TUTOR })
  @IsOptional()
  @IsEnum(AiTutorMode)
  mode?: AiTutorMode = AiTutorMode.TUTOR;

  @ApiPropertyOptional({ enum: AiTutorLanguage, default: AiTutorLanguage.EN })
  @IsOptional()
  @IsEnum(AiTutorLanguage)
  language?: AiTutorLanguage = AiTutorLanguage.EN;
}

