import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';

import { PrismaService, Role } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // 1. Get User Profile
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        profile: true,
        institutionMemberships: {
          include: {
            institution: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  // 2. Update Profile & Avatar
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { fullName, bio, avatarUrl, phoneNumber, timezone } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (fullName) {
        await tx.user.update({
          where: { id: userId },
          data: { fullName: fullName.trim() },
        });
      }

      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          bio: bio?.trim(),
          avatarUrl: avatarUrl?.trim(),
          phoneNumber: phoneNumber?.trim(),
          timezone: timezone || 'Africa/Addis_Ababa',
        },
        update: {
          ...(bio !== undefined && { bio: bio.trim() }),
          ...(avatarUrl !== undefined && { avatarUrl: avatarUrl.trim() }),
          ...(phoneNumber !== undefined && { phoneNumber: phoneNumber.trim() }),
          ...(timezone !== undefined && { timezone }),
        },
      });

      return profile;
    });
  }

  // 3. Role Assignment (SUPER_ADMIN only)
  async updateUserRole(adminUser: AuthenticatedUser, targetUserId: string, newRole: Role) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.role === newRole) {
      return targetUser;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    // Audit sensitive role change
    await this.prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'USER_ROLE_ASSIGNED',
        entityType: 'User',
        entityId: targetUserId,
        metadata: {
          previousRole: targetUser.role,
          assignedRole: newRole,
          adminEmail: adminUser.email,
        },
      },
    });

    this.logger.log(
      `Role escalated for user ${targetUser.email}: ${targetUser.role} -> ${newRole} by admin ${adminUser.email}`,
    );

    return updatedUser;
  }

  // 4. Account Suspension & Reactivation (SUPER_ADMIN only)
  async setUserStatus(adminUser: AuthenticatedUser, targetUserId: string, dto: SuspendUserDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Prevent suspending root admin
    if (targetUser.role === Role.SUPER_ADMIN && !dto.isActive) {
      throw new ForbiddenException('Root Super Admin accounts cannot be suspended');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    // If suspending user, revoke all active refresh tokens immediately to terminate live sessions
    if (!dto.isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId },
        data: { isRevoked: true },
      });
    }

    // Audit sensitive status mutation
    await this.prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: dto.isActive ? 'USER_ACCOUNT_REACTIVATED' : 'USER_ACCOUNT_SUSPENDED',
        entityType: 'User',
        entityId: targetUserId,
        metadata: {
          reason: dto.reason || 'No reason provided',
          adminEmail: adminUser.email,
        },
      },
    });

    this.logger.warn(
      `User ${targetUser.email} status changed to isActive=${dto.isActive} by admin ${adminUser.email}`,
    );

    return updatedUser;
  }

  // 5. Faculty & Member Invitation Workflow
  async createInvitation(inviter: AuthenticatedUser, dto: InviteMemberDto) {
    // Privilege boundary: Cannot invite SUPER_ADMIN via email token
    if (dto.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin accounts cannot be provisioned via standard invitation');
    }

    // Check if target email already has an active account
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email address is already registered');
    }

    let institutionId = dto.institutionId;

    // If caller is an INSTITUTION_ADMIN, enforce their own institution boundary
    if (inviter.role === Role.INSTITUTION_ADMIN) {
      const membership = await this.prisma.institutionMember.findFirst({
        where: { userId: inviter.id, role: Role.INSTITUTION_ADMIN },
      });

      if (!membership) {
        throw new ForbiddenException('You are not associated with any active institution administration');
      }

      institutionId = membership.institutionId;
    }

    const rawToken = crypto.randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        role: dto.role,
        tokenHash,
        institutionId: institutionId || null,
        invitedById: inviter.id,
        expiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: inviter.id,
        action: 'MEMBER_INVITATION_CREATED',
        entityType: 'Invitation',
        entityId: invitation.id,
        metadata: {
          inviteeEmail: dto.email,
          role: dto.role,
          institutionId,
        },
      },
    });

    await this.mailService.sendVerificationEmail(
      dto.email,
      rawToken,
      'Invited Member',
    );

    this.logger.log(
      `[INVITATION SENT] Invitation Token created for "${dto.email}" as ${dto.role} (Token: ${rawToken})`,
    );

    return {
      message: `Invitation successfully sent to ${dto.email}`,
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
    };
  }

  // 6. Accept Invitation
  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = this.hashToken(dto.token);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    if (invitation.acceptedAt !== null) {
      throw new BadRequestException('This invitation has already been accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired. Please request a new invite.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          fullName: dto.fullName.trim(),
          passwordHash,
          role: invitation.role,
          isEmailVerified: true, // Invitations sent to email are pre-verified
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
        },
      });

      if (invitation.institutionId) {
        await tx.institutionMember.create({
          data: {
            institutionId: invitation.institutionId,
            userId: newUser.id,
            role: invitation.role,
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return {
        message: 'Invitation accepted and account activated successfully. You can now log in.',
        user: newUser,
      };
    });
  }

  // 7. Directory Listing (SUPER_ADMIN or INSTITUTION_ADMIN)
  async listUsers(caller: AuthenticatedUser, query: { role?: Role; search?: string }) {
    if (caller.role === Role.SUPER_ADMIN) {
      return this.prisma.user.findMany({
        where: {
          ...(query.role && { role: query.role }),
          ...(query.search && {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        take: 50,
      });
    }

    if (caller.role === Role.INSTITUTION_ADMIN) {
      const membership = await this.prisma.institutionMember.findFirst({
        where: { userId: caller.id, role: Role.INSTITUTION_ADMIN },
      });

      if (!membership) {
        throw new ForbiddenException('No institution admin membership found');
      }

      return this.prisma.user.findMany({
        where: {
          institutionMemberships: {
            some: { institutionId: membership.institutionId },
          },
          ...(query.role && { role: query.role }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        take: 50,
      });
    }

    throw new ForbiddenException('You do not have permission to view the user directory');
  }
}
