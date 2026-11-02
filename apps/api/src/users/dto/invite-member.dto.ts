import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../database/prisma.service';

export class InviteMemberDto {
  @ApiProperty({ example: 'instructor@aait.edu.et' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: [Role.TEACHER, Role.INSTITUTION_ADMIN, Role.INDEPENDENT_INSTRUCTOR], example: Role.TEACHER })
  @IsEnum(Role, { message: 'Must be a valid privileged role' })
  @IsNotEmpty()
  role!: Role;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID('4', { message: 'Institution ID must be a valid UUID' })
  institutionId?: string;
}

