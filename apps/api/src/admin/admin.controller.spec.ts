import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role, CourseStatus } from '../database/prisma.service';
import { ModerationAction } from './dto/moderate-course.dto';

describe('AdminController (Phase 8J: Platform Moderation & Audit Logs)', () => {
  let controller: AdminController;
  let service: any;

  const mockAdmin: AuthenticatedUser = {
    id: 'super-admin-1',
    email: 'admin@eduverse.et',
    fullName: 'System Administrator',
    role: Role.SUPER_ADMIN,
    isActive: true,
    isEmailVerified: true,
  };

  beforeEach(async () => {
    service = {
      getOverview: jest.fn().mockResolvedValue({ users: { total: 10 } }),
      getAnalytics: jest.fn().mockResolvedValue({ totalUsers: 10 }),
      getUsers: jest.fn().mockResolvedValue({ users: [], total: 0 }),
      getUserById: jest.fn().mockResolvedValue({ id: 'u-1', email: 'test@eduverse.et' }),
      setUserStatus: jest.fn().mockResolvedValue({ id: 'u-1', isActive: false }),
      getCoursesForModeration: jest.fn().mockResolvedValue([]),
      getCourseForReview: jest.fn().mockResolvedValue({ id: 'c-1', title: 'ML' }),
      moderateCourse: jest.fn().mockResolvedValue({ id: 'c-1', status: CourseStatus.PUBLISHED }),
      getReviewsForModeration: jest.fn().mockResolvedValue({ reviews: [], total: 0 }),
      moderateReview: jest.fn().mockResolvedValue({ success: true }),
      getInstitutions: jest.fn().mockResolvedValue([]),
      getInstitutionById: jest.fn().mockResolvedValue({ id: 'inst-1', name: 'AAU' }),
      createInstitution: jest.fn().mockResolvedValue({ id: 'inst-1' }),
      updateInstitution: jest.fn().mockResolvedValue({ id: 'inst-1' }),
      setInstitutionStatus: jest.fn().mockResolvedValue({ id: 'inst-1', isActive: false }),
      getSettings: jest.fn().mockResolvedValue({ platformName: 'EduVerse' }),
      updateSettings: jest.fn().mockResolvedValue({ platformName: 'EduVerse 2.0' }),
      getAuditLogs: jest.fn().mockResolvedValue({ logs: [], total: 0 }),
      getAuditLogById: jest.fn().mockResolvedValue({ id: 'log-1', action: 'TEST' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: service }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('User Administration', () => {
    it('should delegate getUsers to service', async () => {
      const res = await controller.getUsers({ page: 1, limit: 10 });
      expect(service.getUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(res).toEqual({ users: [], total: 0 });
    });

    it('should delegate getUserById to service', async () => {
      const res = await controller.getUserById('u-1');
      expect(service.getUserById).toHaveBeenCalledWith('u-1');
      expect(res.id).toBe('u-1');
    });

    it('should delegate setUserStatus to service with admin id', async () => {
      const res = await controller.setUserStatus(mockAdmin, 'u-1', {
        isActive: false,
        reason: 'Violated TOS',
      });
      expect(service.setUserStatus).toHaveBeenCalledWith(mockAdmin.id, 'u-1', {
        isActive: false,
        reason: 'Violated TOS',
      });
      expect(res.isActive).toBe(false);
    });
  });

  describe('Course Moderation', () => {
    it('should delegate getCoursesForModeration to service', async () => {
      await controller.getCoursesForModeration(CourseStatus.PENDING_REVIEW);
      expect(service.getCoursesForModeration).toHaveBeenCalledWith(CourseStatus.PENDING_REVIEW);
    });

    it('should delegate getCourseForReview to service', async () => {
      const res = await controller.getCourseForReview('c-1');
      expect(service.getCourseForReview).toHaveBeenCalledWith('c-1');
      expect(res.id).toBe('c-1');
    });

    it('should delegate moderateCourse with admin id and decision', async () => {
      const res = await controller.moderateCourse(mockAdmin, 'c-1', {
        action: ModerationAction.APPROVE,
      });
      expect(service.moderateCourse).toHaveBeenCalledWith(mockAdmin.id, 'c-1', {
        action: ModerationAction.APPROVE,
      });
      expect(res.status).toBe(CourseStatus.PUBLISHED);
    });
  });

  describe('Content Moderation', () => {
    it('should delegate getReviewsForModeration to service', async () => {
      await controller.getReviewsForModeration('c-1', 1, 1, 10);
      expect(service.getReviewsForModeration).toHaveBeenCalledWith({
        courseId: 'c-1',
        rating: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should delegate moderateReview with admin id and reason', async () => {
      const res = await controller.moderateReview(mockAdmin, 'r-1', {
        reason: 'Inappropriate content',
      });
      expect(service.moderateReview).toHaveBeenCalledWith(mockAdmin.id, 'r-1', {
        reason: 'Inappropriate content',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Institution Administration', () => {
    it('should delegate getInstitutions and getInstitutionById', async () => {
      await controller.getInstitutions();
      expect(service.getInstitutions).toHaveBeenCalled();

      await controller.getInstitutionById('inst-1');
      expect(service.getInstitutionById).toHaveBeenCalledWith('inst-1');
    });

    it('should delegate createInstitution and updateInstitution', async () => {
      await controller.createInstitution(mockAdmin, {
        name: 'AAU',
        slug: 'aau',
        contactEmail: 'info@aau.edu.et',
      });
      expect(service.createInstitution).toHaveBeenCalledWith(mockAdmin.id, expect.any(Object));

      await controller.updateInstitution(mockAdmin, 'inst-1', { name: 'AAU New' });
      expect(service.updateInstitution).toHaveBeenCalledWith(mockAdmin.id, 'inst-1', expect.any(Object));
    });

    it('should delegate setInstitutionStatus', async () => {
      await controller.setInstitutionStatus(mockAdmin, 'inst-1', false, 'Auditing');
      expect(service.setInstitutionStatus).toHaveBeenCalledWith(mockAdmin.id, 'inst-1', false, 'Auditing');
    });
  });

  describe('Global Platform Settings', () => {
    it('should delegate getSettings and updateSettings', async () => {
      const settings = await controller.getSettings();
      expect(service.getSettings).toHaveBeenCalled();
      expect(settings.platformName).toBe('EduVerse');

      const updated = await controller.updateSettings(mockAdmin, { maintenanceMode: true });
      expect(service.updateSettings).toHaveBeenCalledWith(mockAdmin.id, { maintenanceMode: true });
      expect(updated.platformName).toBe('EduVerse 2.0');
    });
  });

  describe('Audit Trail Inspection', () => {
    it('should delegate getAuditLogs and getAuditLogById', async () => {
      await controller.getAuditLogs({ page: 1, limit: 10, action: 'USER_ACCOUNT_SUSPENDED' });
      expect(service.getAuditLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        action: 'USER_ACCOUNT_SUSPENDED',
      });

      await controller.getAuditLogById('log-1');
      expect(service.getAuditLogById).toHaveBeenCalledWith('log-1');
    });
  });
});

