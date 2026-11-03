// EduVerse — Shared Type Definitions & Contracts

// 1. Roles & Core Identifiers
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INSTITUTION_ADMIN = 'INSTITUTION_ADMIN',
  TEACHER = 'TEACHER',
  INDEPENDENT_INSTRUCTOR = 'INDEPENDENT_INSTRUCTOR',
  STUDENT = 'STUDENT',
}

export type RoleLiteral =
  | 'SUPER_ADMIN'
  | 'INSTITUTION_ADMIN'
  | 'TEACHER'
  | 'INDEPENDENT_INSTRUCTOR'
  | 'STUDENT';

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  ALL_LEVELS = 'ALL_LEVELS',
}

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  PDF_RESOURCE = 'PDF_RESOURCE',
  EXTERNAL_RESOURCE = 'EXTERNAL_RESOURCE',
  ATTACHMENT = 'ATTACHMENT',
}

// 2. Base Entity & User Models
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface BaseUser extends BaseEntity {
  readonly email: string;
  fullName: string;
  role: Role;
  institutionId?: string | null;
  isActive: boolean;
}

// Discriminated Union for Users based on Role
export interface StudentUser extends BaseUser {
  role: Role.STUDENT;
  enrolledCourseCount: number;
  earnedCertificateCount: number;
}

export interface TeacherUser extends BaseUser {
  role: Role.TEACHER;
  assignedDepartment: string;
  publishedCourseCount: number;
}

export interface InstitutionAdminUser extends BaseUser {
  role: Role.INSTITUTION_ADMIN;
  institutionId: string; // Mandatory for institution admins
}

export interface SuperAdminUser extends BaseUser {
  role: Role.SUPER_ADMIN;
  hasRootPermissions: true;
}

export type AppUser = StudentUser | TeacherUser | InstitutionAdminUser | SuperAdminUser;

// 3. Curriculum Entities
export interface Course extends BaseEntity {
  title: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  category: string;
  categoryId?: string | null;
  status: CourseStatus;
  difficulty?: CourseDifficulty;
  language?: string;
  learningObjectives?: readonly string[];
  prerequisites?: readonly string[];
  estimatedHours?: number;
  readonly authorId: string;
  readonly author?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  readonly institutionId?: string | null;
  tags?: readonly string[];
  enrollmentCount?: number;
  ratingAverage?: number;
  reviewCount?: number;
  sectionsCount?: number;
  lessonsCount?: number;
}

export interface CourseSection extends BaseEntity {
  readonly courseId: string;
  title: string;
  sortOrder: number;
  lessons?: Lesson[];
}

export interface Module extends BaseEntity {
  readonly courseId: string;
  title: string;
  sortOrder: number;
}

export interface CourseResource extends BaseEntity {
  readonly lessonId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface Review extends BaseEntity {
  readonly courseId: string;
  readonly userId: string;
  rating: number;
  comment?: string | null;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export interface Lesson extends BaseEntity {
  readonly sectionId?: string;
  readonly moduleId?: string;
  title: string;
  slug: string;
  content: string; // Markdown text
  videoUrl?: string | null;
  durationMinutes: number;
  sortOrder: number;
  type?: LessonType;
  isFreePreview?: boolean;
  resources?: CourseResource[];
}

// 4. Enrollment & Progress Checkpoints
export interface Enrollment extends BaseEntity {
  readonly userId: string;
  readonly courseId: string;
  progressPercentage: number;
  completedAt?: string | null;
}

export interface LessonProgress extends BaseEntity {
  readonly enrollmentId: string;
  readonly lessonId: string;
  completed: boolean;
  completedAt: string;
}

// 5. Verification & Certificates
export interface Certificate extends BaseEntity {
  readonly verificationCode: string;
  readonly enrollmentId: string;
  readonly userId: string;
  readonly courseId: string;
  recipientName: string;
  courseTitle: string;
  issuedAt: string;
  institutionName?: string | null;
}

// 6. Generic API Wrappers & Pagination
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: readonly T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

// 7. Result Type for Functional Error Handling
export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };
