import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContentModerationDto {
  @ApiProperty({
    example: 'Violated platform community guidelines: spam promotional content',
    description: 'Mandatory justification or policy violation reason for content moderation',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

