import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus, CourseDifficulty } from '../../database/prisma.service';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Advanced Distributed Systems with TypeScript' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 'Comprehensive guide to building resilient systems...' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.eduverse.et/courses/thumbnails/dist-systems.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'Thumbnail must be a valid URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'cat-uuid-1' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({
    example: ['Understand event-driven architecture'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiPropertyOptional({
    example: ['Basic knowledge of TypeScript'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  estimatedHours?: number;

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ example: 'dept-uuid-1' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'inst-uuid-1' })
  @IsOptional()
  @IsString()
  institutionId?: string;
}
