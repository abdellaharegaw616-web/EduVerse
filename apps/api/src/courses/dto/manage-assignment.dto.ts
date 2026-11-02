import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertAssignmentDto {
  @ApiProperty({ example: 'Architectural Analysis and Monorepo Project' })
  @IsString()
  @IsNotEmpty({ message: 'Assignment title is required' })
  title!: string;

  @ApiProperty({ example: 'Submit a GitHub repository link and architecture documentation...' })
  @IsString()
  @IsNotEmpty({ message: 'Instructions are required' })
  instructions!: string;

  @ApiPropertyOptional({ example: 100, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: string;
}

