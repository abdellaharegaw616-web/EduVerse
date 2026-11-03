import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '../../database/prisma.service';

export class CreateLessonDto {
  @ApiProperty({ example: 'Introduction to Event-Driven Microservices' })
  @IsString()
  @IsNotEmpty({ message: 'Lesson title is required' })
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: '# Lesson Notes\n\nIn this session we cover...' })
  @IsString()
  @IsNotEmpty({ message: 'Lesson content is required' })
  content!: string;

  @ApiPropertyOptional({ example: 'https://cdn.eduverse.et/videos/lesson1.mp4' })
  @IsOptional()
  @IsUrl({}, { message: 'Video URL must be a valid URL' })
  videoUrl?: string;

  @ApiPropertyOptional({ enum: LessonType, default: LessonType.VIDEO })
  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
