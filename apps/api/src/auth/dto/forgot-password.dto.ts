import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@institution.edu.et' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty()
  email!: string;
}

