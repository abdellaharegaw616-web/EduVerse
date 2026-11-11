import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertNoteDto {
  @ApiPropertyOptional({ example: 'Key Takeaway on PostgreSQL Indexes' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 'Remember to add composite index on (userId, lessonId).' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBookmarked?: boolean;
}

