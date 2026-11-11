import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Midterm Review Session & Lab Deadline Extension' })
  @IsString()
  @IsNotEmpty({ message: 'Announcement title is required' })
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example:
      'Please review Section 2 lesson notes before Friday. Office hours are open 3:00 PM EAT.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Announcement content is required' })
  @MinLength(5)
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ description: 'Course ID for course-specific announcements' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Institution ID for institutional notices' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}

