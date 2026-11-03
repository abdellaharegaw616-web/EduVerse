import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeAssignmentDto {
  @ApiProperty({
    example: 95,
    description: 'Numeric grade awarded (cannot exceed assignment maxScore)',
  })
  @IsInt()
  @Min(0)
  grade!: number;

  @ApiPropertyOptional({
    example: 'Excellent network topology layout and correct security group definitions.',
    description: 'Qualitative teacher evaluation and constructive feedback',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
