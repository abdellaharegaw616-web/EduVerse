import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../database/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // 1. Student Registration
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    // Argon2id hashing with OWASP recommended parameters (64MB memory cost, 3 iterations)
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        fullName: dto.fullName.trim(),
        passwordHash,
        role: Role.STUDENT,
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // Generate unguessable Email Verification Token
    const rawVerificationToken = crypto.randomUUID();
    const tokenHash = this.hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.mailService.sendVerificationEmail(user.email, rawVerificationToken, user.fullName);

    return {
      message: 'Registration successful. Please verify your email to activate full privileges.',
      user,
    };
  }

  // 2. Login
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Generic error message to prevent account enumeration
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated. Please contact support.');
    }

    return this.createSession(user);
  }

  // Session & Dual-Token Generator
  private async createSession(user: { id: string; email: string; role: Role; fullName: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  // 3. Refresh Token Rotation & Theft/Reuse Detection
  async refreshTokens(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // THEFT / REUSE DETECTION:
    // If the token was already revoked, someone is replaying a spent token!
    if (tokenRecord.isRevoked) {
      this.logger.error(
        `🚨 CRITICAL SECURITY ALERT: Refresh token reuse detected for User ID ${tokenRecord.userId}! Revoking token family ${tokenRecord.familyId}.`,
      );

      // Invalidate the entire token family immediately
      await this.prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { isRevoked: true },
      });

      throw new UnauthorizedException('Security alert: Token reuse detected. All active sessions have been revoked.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    // Mark current token as consumed / revoked
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Generate rotated refresh token in the SAME family
    const nextRawRefreshToken = crypto.randomUUID();
    const nextTokenHash = this.hashToken(nextRawRefreshToken);
    const nextExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: nextTokenHash,
        familyId: tokenRecord.familyId,
        expiresAt: nextExpiresAt,
      },
    });

    const payload: JwtPayload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      fullName: tokenRecord.user.fullName,
    };

    const nextAccessToken = this.jwtService.sign(payload);

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRawRefreshToken,
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        fullName: tokenRecord.user.fullName,
        role: tokenRecord.user.role,
      },
    };
  }

  // 4. Logout (Revoke session)
  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }

    return { message: 'Successfully logged out' };
  }

  // 5. Email Verification
  async verifyEmail(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { isEmailVerified: true },
    });

    await this.prisma.emailVerificationToken.delete({
      where: { id: tokenRecord.id },
    });

    return { message: 'Email verified successfully. You can now access all student features.' };
  }

  // 6. Forgot Password
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && user.isActive) {
      // Clean up previous tokens
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      const rawResetToken = crypto.randomUUID();
      const tokenHash = this.hashToken(rawResetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await this.mailService.sendPasswordResetEmail(user.email, rawResetToken, user.fullName);
    }

    // Always return generic message to avoid email enumeration
    return {
      message: 'If that email address is registered, a password reset link has been sent.',
    };
  }

  // 7. Password Reset
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });
      throw new BadRequestException('Password reset token has expired. Please submit another request.');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all active sessions for security after password reset
    await this.prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId },
      data: { isRevoked: true },
    });

    await this.prisma.passwordResetToken.delete({
      where: { id: tokenRecord.id },
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  // 8. Change Password (Authenticated)
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password does not match our records');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password updated successfully' };
  }

  // 9. Current User Profile Lookup
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
