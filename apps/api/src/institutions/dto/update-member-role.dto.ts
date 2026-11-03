import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../database/prisma.service';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: [Role.INSTITUTION_ADMIN, Role.TEACHER, Role.STUDENT],
    example: Role.TEACHER,
  })
  @IsEnum([Role.INSTITUTION_ADMIN, Role.TEACHER, Role.STUDENT], {
    message: 'Role must be INSTITUTION_ADMIN, TEACHER, or STUDENT',
  })
  @IsNotEmpty()
  role!: Role;
}

