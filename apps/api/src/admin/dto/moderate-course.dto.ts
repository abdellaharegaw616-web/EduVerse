import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModerationAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ModerateCourseDto {
  @ApiProperty({ enum: ModerationAction, description: 'Moderation decision: APPROVE or REJECT' })
  @IsEnum(ModerationAction)
  action!: ModerationAction;

  @ApiPropertyOptional({ description: 'Optional feedback or rejection reason for the author' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

