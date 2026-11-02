import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService, Role } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import * as argon2 from 'argon2';

describe('AuthService (Unit)', () => {
  let authService: AuthService;
  let prisma: Partial<Record<keyof PrismaService, any>>;
  let jwtService: Partial<JwtService>;
  let mailService: Partial<MailService>;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      emailVerificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as JwtService,
      mailService as MailService,
    );
  });

  describe('Registration', () => {
    it('should register a new student with Argon2id and dispatch verification email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation((args: any) => ({
        id: 'u-1',
        ...args.data,
      }));
      prisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'student@eduverse.et',
        fullName: 'Abebe Tadesse',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('student@eduverse.et');
      expect(result.user.role).toBe(Role.STUDENT);
      expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'student@eduverse.et',
        expect.any(String),
        'Abebe Tadesse',
      );
    });

    it('should throw ConflictException on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'student@eduverse.et' });

      await expect(
        authService.register({
          email: 'student@eduverse.et',
          fullName: 'Abebe Tadesse',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Login & Password Verification', () => {
    it('should login valid user and return access & refresh tokens', async () => {
      const passwordHash = await argon2.hash('Password123!', { type: argon2.argon2id });

      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'student@eduverse.et',
        fullName: 'Abebe Tadesse',
        passwordHash,
        role: Role.STUDENT,
        isActive: true,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({
        email: 'student@eduverse.et',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('student@eduverse.et');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should reject incorrect password with generic UnauthorizedException', async () => {
      const passwordHash = await argon2.hash('CorrectPassword123!', { type: argon2.argon2id });

      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'student@eduverse.et',
        passwordHash,
        isActive: true,
      });

      await expect(
        authService.login({
          email: 'student@eduverse.et',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });
  });

  describe('Refresh Token Rotation & Theft Detection', () => {
    it('should rotate valid refresh token and return fresh pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'u-1',
        familyId: 'family-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'u-1', email: 'student@eduverse.et', fullName: 'Abebe', role: Role.STUDENT },
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.refreshTokens('valid-token-string');

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBeDefined();
      // Verifies old token was marked isRevoked: true
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should detect token reuse and revoke the entire token family', async () => {
      // Simulate stolen already-revoked token
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'u-1',
        familyId: 'compromised-family-id',
        isRevoked: true, // Already consumed!
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'u-1' },
      });

      await expect(authService.refreshTokens('replayed-stolen-token')).rejects.toThrow(
        /Token reuse detected/,
      );

      // Verifies entire family was revoked
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'compromised-family-id' },
        data: { isRevoked: true },
      });
    });
  });

  describe('Password Reset Workflow', () => {
    it('should reset password with Argon2id and revoke all existing sessions', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'u-1',
        expiresAt: new Date(Date.now() + 60000),
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({});
      prisma.passwordResetToken.delete.mockResolvedValue({});

      const result = await authService.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'BrandNewPassword123!',
      });

      expect(result.message).toContain('Password has been reset successfully');
      expect(prisma.user.update).toHaveBeenCalled();
      // All existing refresh tokens revoked on password reset for security
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
        data: { isRevoked: true },
      });
    });
  });
});
