import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Role } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

describe('AnalyticsController (Phase 8I: Analytics & Reporting)', () => {
  let controller: AnalyticsController;
  let service: any;

  beforeEach(async () => {
    service = {
      getStudentAnalytics: jest.fn().mockResolvedValue({ userId: 'student-1' }),
      getTeacherAnalytics: jest.fn().mockResolvedValue({ teacherId: 'teacher-1' }),
      getInstitutionAnalytics: jest.fn().mockResolvedValue({ institutionId: 'inst-1' }),
      getPlatformAnalytics: jest.fn().mockResolvedValue({ telemetryWindowDays: 30 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: service }],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  describe('getStudentAnalytics', () => {
    it('should delegate to service with current student id', async () => {
      const res = await controller.getStudentAnalytics('student-1');
      expect(service.getStudentAnalytics).toHaveBeenCalledWith('student-1');
      expect(res).toEqual({ userId: 'student-1' });
    });
  });

  describe('getTeacherAnalytics', () => {
    it('should delegate to service with caller id and super admin boolean', async () => {
      const teacherCaller: AuthenticatedUser = {
        id: 'teacher-1',
        email: 'teacher@aau.edu.et',
        fullName: 'Teacher Name',
        role: Role.TEACHER,
        isActive: true,
        isEmailVerified: true,
      };

      const res = await controller.getTeacherAnalytics(teacherCaller, { courseId: 'c-100' });
      expect(service.getTeacherAnalytics).toHaveBeenCalledWith('teacher-1', { courseId: 'c-100' }, false);
      expect(res).toEqual({ teacherId: 'teacher-1' });

      // Super Admin caller
      const adminCaller: AuthenticatedUser = {
        ...teacherCaller,
        id: 'admin-1',
        role: Role.SUPER_ADMIN,
      };
      await controller.getTeacherAnalytics(adminCaller, { courseId: 'c-100' });
      expect(service.getTeacherAnalytics).toHaveBeenCalledWith('admin-1', { courseId: 'c-100' }, true);
    });
  });

  describe('getInstitutionAnalytics', () => {
    it('should delegate to service with caller and query parameters', async () => {
      const adminCaller: AuthenticatedUser = {
        id: 'inst-admin-1',
        email: 'instadmin@aau.edu.et',
        fullName: 'Institution Admin',
        role: Role.INSTITUTION_ADMIN,
        isActive: true,
        isEmailVerified: true,
      };

      const query = { page: 1, limit: 10 };
      const res = await controller.getInstitutionAnalytics(adminCaller, query);
      expect(service.getInstitutionAnalytics).toHaveBeenCalledWith(adminCaller, query);
      expect(res).toEqual({ institutionId: 'inst-1' });
    });
  });

  describe('getPlatformAnalytics', () => {
    it('should delegate to service with days query parameter', async () => {
      const res = await controller.getPlatformAnalytics({ days: 14 });
      expect(service.getPlatformAnalytics).toHaveBeenCalledWith(14);
      expect(res).toEqual({ telemetryWindowDays: 30 });
    });
  });
});

