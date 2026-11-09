import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../database/prisma.service';

describe('RolesGuard (RBAC Security Verification)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('Public / Unrestricted Endpoints', () => {
    it('should allow access if no roles are defined on handler or class', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if required roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('Authentication & Account Status Enforcements', () => {
    it('should throw ForbiddenException if user is not attached to request', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STUDENT]);
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('Authentication required'),
      );
    });

    it('should throw ForbiddenException if user account is suspended (isActive: false)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.STUDENT]);
      const context = createMockContext({
        id: 'u-suspended',
        role: Role.STUDENT,
        isActive: false,
      });

      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('Account is suspended. Access denied.'),
      );
    });
  });

  describe('Role-Based Access Verification (All 5 Roles)', () => {
    const roles: Role[] = [
      Role.SUPER_ADMIN,
      Role.INSTITUTION_ADMIN,
      Role.TEACHER,
      Role.INDEPENDENT_INSTRUCTOR,
      Role.STUDENT,
    ];

    roles.forEach((role) => {
      it(`should allow access for authorized role: ${role}`, () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([role]);
        const context = createMockContext({
          id: `user-${role}`,
          role,
          isActive: true,
        });

        expect(guard.canActivate(context)).toBe(true);
      });
    });

    it('should allow access when user role is one of multiple permitted roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Role.TEACHER,
        Role.INDEPENDENT_INSTRUCTOR,
        Role.SUPER_ADMIN,
      ]);

      const teacherContext = createMockContext({
        id: 't-1',
        role: Role.TEACHER,
        isActive: true,
      });
      expect(guard.canActivate(teacherContext)).toBe(true);

      const instructorContext = createMockContext({
        id: 'i-1',
        role: Role.INDEPENDENT_INSTRUCTOR,
        isActive: true,
      });
      expect(guard.canActivate(instructorContext)).toBe(true);

      const adminContext = createMockContext({
        id: 'a-1',
        role: Role.SUPER_ADMIN,
        isActive: true,
      });
      expect(guard.canActivate(adminContext)).toBe(true);
    });

    it('should deny access when user role is not permitted', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Role.SUPER_ADMIN,
        Role.INSTITUTION_ADMIN,
      ]);

      const studentContext = createMockContext({
        id: 's-1',
        role: Role.STUDENT,
        isActive: true,
      });

      expect(() => guard.canActivate(studentContext)).toThrow(
        /Access forbidden: requires one of the following roles/,
      );
    });

    it('should reject STUDENT attempting to access TEACHER route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.TEACHER]);

      const studentContext = createMockContext({
        id: 's-1',
        role: Role.STUDENT,
        isActive: true,
      });

      expect(() => guard.canActivate(studentContext)).toThrow(
        new ForbiddenException(
          `Access forbidden: requires one of the following roles: [${Role.TEACHER}]`,
        ),
      );
    });

    it('should reject TEACHER attempting to access SUPER_ADMIN route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SUPER_ADMIN]);

      const teacherContext = createMockContext({
        id: 't-1',
        role: Role.TEACHER,
        isActive: true,
      });

      expect(() => guard.canActivate(teacherContext)).toThrow(
        new ForbiddenException(
          `Access forbidden: requires one of the following roles: [${Role.SUPER_ADMIN}]`,
        ),
      );
    });
  });
});

