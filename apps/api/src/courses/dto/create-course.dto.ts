import {
  IsArray,
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
import { CourseDifficulty } from '../../database/prisma.service';

export class CreateCourseDto {
  @ApiProperty({ example: 'Advanced Distributed Systems with TypeScript' })
  @IsString()
  @IsNotEmpty({ message: 'Course title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(150, { message: 'Title cannot exceed 150 characters' })
  title!: string;

  @ApiProperty({ example: 'Comprehensive guide to building resilient distributed systems...' })
  @IsString()
  @IsNotEmpty({ message: 'Course description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  description!: string;

  @ApiPropertyOptional({ example: 'https://cdn.eduverse.et/courses/thumbnails/dist-systems.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'Thumbnail must be a valid URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'cat-uuid-1' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'English', default: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty, default: CourseDifficulty.BEGINNER })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({
    example: ['Understand event-driven architecture', 'Implement CQRS with Kafka'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiPropertyOptional({
    example: ['Basic knowledge of TypeScript', 'Familiarity with Node.js async/await'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ example: 12, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  estimatedHours?: number;

  @ApiPropertyOptional({ example: 'dept-uuid-1' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'inst-uuid-1' })
  @IsOptional()
  @IsString()
  institutionId?: string;
}
