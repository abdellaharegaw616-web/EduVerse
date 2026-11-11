import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DraftFeedbackDto {
  @ApiProperty({ description: 'Assignment submission ID to draft evaluation feedback for' })
  @IsUUID()
  submissionId!: string;

  @ApiPropertyOptional({ example: 88, description: 'Optional proposed score to tailor the feedback tone' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  proposedGrade?: number;
}

