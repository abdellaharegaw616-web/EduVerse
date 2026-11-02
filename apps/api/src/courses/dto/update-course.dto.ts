import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus } from '../../database/prisma.service';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Advanced Distributed Systems' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated course curriculum...' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional({ enum: CourseStatus, example: CourseStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(CourseStatus, { message: 'Status must be DRAFT, PENDING_REVIEW, PUBLISHED, or ARCHIVED' })
  status?: CourseStatus;

  @ApiPropertyOptional({ example: 'cat-uuid-1' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'dept-uuid-1' })
  @IsOptional()
  @IsString()
  departmentId?: string;
}

