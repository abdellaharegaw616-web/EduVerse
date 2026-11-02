import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'The verification token sent to the user email' })
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token!: string;
}

