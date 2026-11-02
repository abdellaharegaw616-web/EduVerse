import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'The invitation token received via email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'Dr. Bethlehem Assefa' })
  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: 'FacultyPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;
}

