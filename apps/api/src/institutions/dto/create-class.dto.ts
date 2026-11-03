import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Data Structures & Algorithms - Section A' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4')
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID('4')
  @IsNotEmpty()
  teacherId!: string;

  @ApiProperty({ example: '2025/2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear!: string;
}

