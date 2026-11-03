import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeCertificateDto {
  @ApiProperty({
    example: 'Course completion was invalidated due to academic dishonesty or chargeback.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

