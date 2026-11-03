import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../database/prisma.service';

export class TenantInviteDto {
  @ApiProperty({ example: 'prof.abebe@aau.edu.et' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    enum: [Role.TEACHER, Role.INSTITUTION_ADMIN],
    example: Role.TEACHER,
  })
  @IsEnum([Role.TEACHER, Role.INSTITUTION_ADMIN], {
    message: 'Institution invites may only be issued for TEACHER or INSTITUTION_ADMIN roles',
  })
  role!: Role;
}
