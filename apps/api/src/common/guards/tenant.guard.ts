import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role, PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super Admin has root governance across all tenants
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const targetInstitutionId =
      request.params?.institutionId ||
      request.query?.institutionId ||
      request.body?.institutionId;

    if (!targetInstitutionId) {
      return true;
    }

    // Verify membership in target institution
    const membership = await this.prisma.institutionMember.findUnique({
      where: {
        institutionId_userId: {
          institutionId: targetInstitutionId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Cross-institution access is strictly forbidden. You are not a member of this institution.',
      );
    }

    // If an Institution Admin, verify they have admin role in this specific institution
    if (user.role === Role.INSTITUTION_ADMIN && membership.role !== Role.INSTITUTION_ADMIN) {
      throw new ForbiddenException(
        'You do not have administrative privileges in this institution.',
      );
    }

    return true;
  }
}

