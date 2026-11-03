import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ example: 'Lecture Slides (PDF)' })
  @IsString()
  @IsNotEmpty({ message: 'Resource title is required' })
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: 'https://cdn.eduverse.et/resources/lecture1.pdf' })
  @IsString()
  @IsNotEmpty({ message: 'File URL is required' })
  @IsUrl({}, { message: 'File URL must be a valid URL' })
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'PDF', default: 'PDF' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ example: 2048000, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;
}

