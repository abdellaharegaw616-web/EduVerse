import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter analytics to a specific course ID (must be authored by caller)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  courseId?: string;
}

