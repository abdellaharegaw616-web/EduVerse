import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'student@institution.edu.et' })
  @IsEmail({}, { message: 'Please provide a valid academic or personal email' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Abebe Bekele' })
  @IsString()
  @MinLength(2, { message: 'Full name must have at least 2 characters' })
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;
}

