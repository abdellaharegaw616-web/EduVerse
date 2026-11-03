import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({
    example: 'Ethiopian Cloud Infrastructure Design Spec',
    description: 'Assignment title',
  })
  @IsString()
  @IsNotEmpty({ message: 'Assignment title is required' })
  title!: string;

  @ApiProperty({
    example: 'Design a high-availability multi-tier architecture deployable in Addis Ababa with VPC peering.',
    description: 'Detailed instructions and rubric criteria for students',
  })
  @IsString()
  @IsNotEmpty({ message: 'Instructions are required' })
  instructions!: string;

  @ApiPropertyOptional({
    example: 100,
    default: 100,
    description: 'Maximum achievable score',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({
    example: '2026-11-30T23:59:59.000Z',
    description: 'ISO-8601 deadline after which submissions are rejected as late',
  })
  @IsOptional()
  @IsString()
  dueDate?: string;
}
