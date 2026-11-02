import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: 'cat-uuid-1' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'dept-uuid-1' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'inst-uuid-1' })
  @IsOptional()
  @IsString()
  institutionId?: string;
}

