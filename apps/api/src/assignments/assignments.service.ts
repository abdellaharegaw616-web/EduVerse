import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeAssignmentDto } from './dto/grade-assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.zip',
  '.tar.gz',
  '.docx',
  '.doc',
  '.txt',
  '.py',
  '.ipynb',
  '.png',
  '.jpg',
  '.jpeg',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Get all assignments for enrolled courses with student submission standing.
   */
  async getMyAssignments(userId: string) {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        lesson: {
          section: {
            course: {
              enrollments: { some: { userId } },
            },
          },
        },
      },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  select: { id: true, title: true, slug: true },
                },
              },
            },
          },
        },
        submissions: {
          where: { userId },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return assignments.map((assignment) => {
      const submission = assignment.submissions[0] || null;
      return {
        id: assignment.id,
        title: assignment.title,
        instructions: assignment.instructions,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate,
        courseTitle: assignment.lesson.section.course.title,
        courseSlug: assignment.lesson.section.course.slug,
        lessonTitle: assignment.lesson.title,
        status: submission ? submission.status : 'PENDING',
        grade: submission ? submission.grade : null,
        feedback: submission ? submission.feedback : null,
        submittedAt: submission ? submission.submittedAt : null,
        gradedAt: submission ? submission.gradedAt : null,
      };
    });
  }

  /**
   * 2. Get specific assignment details.
   * Enforces course enrollment or author privileges.
   */
  async getAssignmentDetails(userId: string, assignmentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
        submissions: {
          where: { userId },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found.`);
    }

    const isAuthor = assignment.lesson.section.course.authorId === userId;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    if (!isAuthor && !isSuperAdmin) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: assignment.lesson.section.courseId,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'Access denied: You must be enrolled in this course to view this assignment.',
        );
      }
    }

    const studentSubmission = assignment.submissions[0] || null;
    const isLate = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

    return {
      id: assignment.id,
      title: assignment.title,
      instructions: assignment.instructions,
      maxScore: assignment.maxScore,
      dueDate: assignment.dueDate,
      isLate,
      lessonId: assignment.lessonId,
      lessonTitle: assignment.lesson.title,
      courseId: assignment.lesson.section.course.id,
      courseTitle: assignment.lesson.section.course.title,
      courseSlug: assignment.lesson.section.course.slug,
      submission: studentSubmission
        ? {
            id: studentSubmission.id,
            content: studentSubmission.content,
            fileUrl: studentSubmission.fileUrl,
            status: studentSubmission.status,
            grade: studentSubmission.grade,
            feedback: studentSubmission.feedback,
            submittedAt: studentSubmission.submittedAt,
            gradedAt: studentSubmission.gradedAt,
          }
        : null,
    };
  }

  /**
   * 3. Submit assignment work for student.
   * Validates deadlines, file types, file size limits, and enrollment.
   */
  async submitAssignment(userId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found.`);
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: assignment.lesson.section.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'Cannot submit assignment: You are not enrolled in this course.',
      );
    }

    // 1. Validate payload presence
    const content = dto.content?.trim();
    const fileUrl = dto.fileUrl?.trim();
    if (!content && !fileUrl) {
      throw new BadRequestException(
        'Submission must include either written text content or an attached file.',
      );
    }

    // 2. Enforce Deadlines
    const now = new Date();
    if (assignment.dueDate && now > new Date(assignment.dueDate)) {
      throw new BadRequestException(
        'Assignment submission deadline has passed (Late submission rejected).',
      );
    }

    // 3. Validate File Type and Size
    if (fileUrl || dto.fileName) {
      const targetFilename = (dto.fileName || fileUrl || '').toLowerCase();
      const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => targetFilename.endsWith(ext));

      if (!hasValidExt) {
        throw new BadRequestException(
          'Invalid file type. Allowed formats: PDF, ZIP, DOCX, TXT, PY, IPYNB, PNG, JPG.',
        );
      }

      if (dto.fileSize && dto.fileSize > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException('File size exceeds the maximum allowed limit of 25MB.');
      }
    }

    // 4. Check existing submission state
    const existingSubmission = await this.prisma.assignmentSubmission.findFirst({
      where: { assignmentId, userId },
    });

    if (existingSubmission && existingSubmission.status === 'GRADED') {
      throw new BadRequestException(
        'Cannot modify an assignment that has already been graded by the instructor.',
      );
    }

    // 5. Atomic Upsert of Submission
    const submission = existingSubmission
      ? await this.prisma.assignmentSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            content: content || null,
            fileUrl: fileUrl || null,
            status: 'PENDING',
            submittedAt: now,
          },
        })
      : await this.prisma.assignmentSubmission.create({
          data: {
            assignmentId,
            enrollmentId: enrollment.id,
            userId,
            content: content || null,
            fileUrl: fileUrl || null,
            status: 'PENDING',
            submittedAt: now,
          },
        });

    // 6. Record Audit Trail & Notify Course Instructor
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action: 'ASSIGNMENT_SUBMITTED',
          entityType: 'Assignment',
          entityId: assignmentId,
          metadata: {
            assignmentTitle: assignment.title,
            submissionId: submission.id,
            hasFile: !!fileUrl,
            submittedAt: now,
          },
        },
      })
      .catch(() => null);

    await this.prisma.notification
      .create({
        data: {
          userId: assignment.lesson.section.course.authorId,
          title: 'New Student Submission 📥',
          message: `A student submitted work for "${assignment.title}".`,
          actionUrl: `/teacher/grading`,
        },
      })
      .catch(() => null);

    return submission;
  }

  /**
   * 4. Get specific submission details.
   * Validates that only the student owner, course author, or super admin can inspect it.
   */
  async getSubmissionDetails(callerId: string, submissionId: string, isSuperAdmin = false) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        assignment: {
          include: {
            lesson: {
              include: {
                section: {
                  include: {
                    course: {
                      select: { id: true, title: true, slug: true, authorId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }

    const isStudentOwner = submission.userId === callerId;
    const isCourseAuthor = submission.assignment.lesson.section.course.authorId === callerId;

    if (!isStudentOwner && !isCourseAuthor && !isSuperAdmin) {
      throw new ForbiddenException('You do not have permission to view this submission.');
    }

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      assignmentTitle: submission.assignment.title,
      maxScore: submission.assignment.maxScore,
      dueDate: submission.assignment.dueDate,
      courseTitle: submission.assignment.lesson.section.course.title,
      studentId: submission.user.id,
      studentName: submission.user.fullName,
      studentEmail: submission.user.email,
      content: submission.content,
      fileUrl: submission.fileUrl,
      status: submission.status,
      grade: submission.grade,
      feedback: submission.feedback,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
    };
  }

  /**
   * 5. Teacher: Grade Student Submission.
   * Validates author ownership, maximum score threshold, updates timestamps, and records audit.
   */
  async gradeSubmission(
    teacherId: string,
    submissionId: string,
    dto: GradeAssignmentDto,
    isSuperAdmin = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Your account is suspended.');
    }

    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            lesson: {
              include: {
                section: {
                  include: { course: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }

    if (!isSuperAdmin && submission.assignment.lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to grade this submission.');
    }

    if (dto.grade > submission.assignment.maxScore) {
      throw new BadRequestException(
        `Grade (${dto.grade}) cannot exceed the maximum score of ${submission.assignment.maxScore}.`,
      );
    }

    const gradedAt = new Date();

    const updated = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback?.trim() || null,
        status: 'GRADED',
        gradedAt,
      },
    });

    // Record Audit Log
    await this.prisma.auditLog
      .create({
        data: {
          userId: teacherId,
          action: 'ASSIGNMENT_GRADED',
          entityType: 'AssignmentSubmission',
          entityId: submissionId,
          metadata: {
            grade: dto.grade,
            maxScore: submission.assignment.maxScore,
            studentId: submission.userId,
            gradedAt,
          },
        },
      })
      .catch(() => null);

    // Notify Student of Graded Work & Feedback
    await this.prisma.notification
      .create({
        data: {
          userId: submission.userId,
          title: 'Assignment Graded! 📝',
          message: `Your submission for "${submission.assignment.title}" received a grade of ${dto.grade}/${submission.assignment.maxScore}.`,
          actionUrl: `/app/assignments`,
        },
      })
      .catch(() => null);

    return updated;
  }

  /**
   * 6. Teacher: Upsert Assignment for a Lesson.
   */
  async upsertAssignment(
    teacherId: string,
    lessonId: string,
    dto: CreateAssignmentDto,
    isSuperAdmin = false,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: { course: true },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found.`);
    }

    if (!isSuperAdmin && lesson.section.course.authorId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage this lesson.');
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    return this.prisma.assignment.upsert({
      where: { lessonId },
      create: {
        lessonId,
        title: dto.title.trim(),
        instructions: dto.instructions.trim(),
        maxScore: dto.maxScore || 100,
        dueDate,
      },
      update: {
        title: dto.title.trim(),
        instructions: dto.instructions.trim(),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        dueDate,
      },
    });
  }

  /**
   * 7. Teacher: Get all submissions for teacher's courses.
   */
  async getTeacherSubmissions(teacherId: string, status?: string) {
    const where: any = {
      assignment: {
        lesson: {
          section: {
            course: { authorId: teacherId },
          },
        },
      },
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const submissions = await this.prisma.assignmentSubmission.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        assignment: {
          include: {
            lesson: {
              include: {
                section: {
                  include: {
                    course: { select: { id: true, title: true, slug: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });

    return submissions.map((sub) => ({
      id: sub.id,
      assignmentId: sub.assignmentId,
      assignmentTitle: sub.assignment.title,
      maxScore: sub.assignment.maxScore,
      dueDate: sub.assignment.dueDate,
      courseTitle: sub.assignment.lesson.section.course.title,
      lessonTitle: sub.assignment.lesson.title,
      studentId: sub.user.id,
      studentName: sub.user.fullName,
      studentEmail: sub.user.email,
      content: sub.content,
      fileUrl: sub.fileUrl,
      status: sub.status,
      grade: sub.grade,
      feedback: sub.feedback,
      submittedAt: sub.submittedAt,
      gradedAt: sub.gradedAt,
    }));
  }
}
