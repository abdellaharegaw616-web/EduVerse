import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Machine Learning & AI',
    description: 'Distinct academic or vocational category name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Curricula covering deep learning, computer vision, and NLP in Ethiopia.',
    description: 'Optional category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Artificial Intelligence & Data Science',
    description: 'Updated category name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description of curriculum topics',
    description: 'Updated category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

