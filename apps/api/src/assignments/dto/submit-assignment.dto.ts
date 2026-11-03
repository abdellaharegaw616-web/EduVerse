import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAssignmentDto {
  @ApiPropertyOptional({
    example: 'Here is my solution architecture design with VPC diagrams and IAM role matrices.',
    description: 'Written text or markdown response',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.eduverse.et/submissions/student_homework.pdf',
    description: 'Attached document or project file URL',
  })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({
    example: 'network_design_spec.pdf',
    description: 'Name of the attached file for type validation',
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    example: 1048576,
    description: 'Size of the file in bytes (max 25MB)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  fileSize?: number;
}
