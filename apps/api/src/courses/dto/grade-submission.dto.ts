import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({ example: 95 })
  @IsInt()
  @Min(0)
  @Max(1000)
  grade!: number;

  @ApiPropertyOptional({ example: 'Great structural design and clean commits.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
