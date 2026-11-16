import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../database/prisma.service';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.TEACHER,
    description: 'Assigned platform role for the target user',
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;
}

