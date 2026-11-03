import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDifficulty } from '../../database/prisma.service';

export enum MarketplaceSortBy {
  POPULAR = 'popular',
  HIGHEST_RATED = 'highest_rated',
  NEWEST = 'newest',
  DURATION_ASC = 'duration_asc',
  DURATION_DESC = 'duration_desc',
}

export class MarketplaceQueryDto {
  @ApiPropertyOptional({ description: 'Search keywords matching title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category slug or ID' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty, description: 'Course difficulty filter' })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ example: 'English', description: 'Course instructional language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: MarketplaceSortBy, default: MarketplaceSortBy.POPULAR })
  @IsOptional()
  @IsEnum(MarketplaceSortBy)
  sortBy?: MarketplaceSortBy = MarketplaceSortBy.POPULAR;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}

