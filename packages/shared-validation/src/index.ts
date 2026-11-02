import { z } from 'zod';
import { Role } from '@eduverse/shared-types';

export const RegisterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const LoginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateCourseSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  category: z.string().trim().min(2, 'Category is required'),
});

export const CreateModuleSchema = z.object({
  title: z.string().trim().min(2, 'Module title is required').max(150),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const CreateLessonSchema = z.object({
  title: z.string().trim().min(2, 'Lesson title is required').max(150),
  content: z.string().min(1, 'Lesson content is required'),
  videoUrl: z.string().url('Invalid video URL').optional().nullable(),
  durationMinutes: z.number().int().positive().default(10),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const InviteTeacherSchema = z.object({
  email: z.string().trim().email('Valid institutional email is required'),
  role: z.enum([Role.TEACHER, Role.INSTITUTION_ADMIN]).default(Role.TEACHER),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type CreateModuleInput = z.infer<typeof CreateModuleSchema>;
export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
export type InviteTeacherInput = z.infer<typeof InviteTeacherSchema>;

