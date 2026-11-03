import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../database/prisma.service';

export class DispatchNotificationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4')
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.COURSE_ANNOUNCEMENT })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({ example: 'New Course Material Posted' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Module 3: Distributed Consensus is now available.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ example: '/courses/cloud-computing/learn' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ example: { courseId: 'course-123' } })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'enrollment:user-1:course-2',
    description: 'Unique key preventing duplicate notification events',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
