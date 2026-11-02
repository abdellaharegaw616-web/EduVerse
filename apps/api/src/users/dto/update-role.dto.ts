import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../database/prisma.service';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.TEACHER })
  @IsEnum(Role, { message: 'Must be a valid platform role' })
  @IsNotEmpty()
  role!: Role;
}

