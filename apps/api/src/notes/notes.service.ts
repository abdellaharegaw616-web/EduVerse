import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService, Role } from '../database/prisma.service';
import { UpsertNoteDto } from './dto/upsert-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyLessonAccess(userId: string, lessonId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new ForbiddenException('Account is suspended or inactive.');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: {
              select: { id: true, authorId: true, title: true, slug: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = lesson.section.course;
    const isPrivileged = user.role === Role.SUPER_ADMIN || course.authorId === userId;

    if (!lesson.isFreePreview && !isPrivileged) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenException('Enroll in this course to save notes and bookmarks.');
      }
    }

    return { lesson, course };
  }

  async getMyNotes(
    userId: string,
    query?: { courseId?: string; bookmarkedOnly?: boolean; search?: string },
  ) {
    const where: any = { userId };

    if (query?.courseId) {
      where.courseId = query.courseId;
    }
    if (query?.bookmarkedOnly) {
      where.isBookmarked = true;
    }
    if (query?.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { lesson: { title: { contains: term, mode: 'insensitive' } } },
        { course: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.lessonNote.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        course: {
          select: { id: true, title: true, slug: true },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            durationMinutes: true,
            section: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  async getLessonNote(userId: string, lessonId: string) {
    await this.verifyLessonAccess(userId, lessonId);

    const note = await this.prisma.lessonNote.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    return (
      note || {
        lessonId,
        title: null,
        content: '',
        isBookmarked: false,
        updatedAt: null,
      }
    );
  }

  async upsertLessonNote(userId: string, lessonId: string, dto: UpsertNoteDto) {
    const { course, lesson } = await this.verifyLessonAccess(userId, lessonId);

    return this.prisma.lessonNote.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        courseId: course.id,
        lessonId,
        title: dto.title?.trim() || lesson.title,
        content: dto.content ?? '',
        isBookmarked: dto.isBookmarked ?? false,
      },
      update: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isBookmarked !== undefined && { isBookmarked: dto.isBookmarked }),
      },
    });
  }

  async toggleBookmark(userId: string, lessonId: string, explicitState?: boolean) {
    const { course, lesson } = await this.verifyLessonAccess(userId, lessonId);

    const existing = await this.prisma.lessonNote.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    const nextState =
      explicitState !== undefined ? explicitState : !(existing?.isBookmarked ?? false);

    return this.prisma.lessonNote.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        courseId: course.id,
        lessonId,
        title: lesson.title,
        content: '',
        isBookmarked: nextState,
      },
      update: {
        isBookmarked: nextState,
      },
    });
  }

  async deleteLessonNote(userId: string, lessonId: string) {
    const existing = await this.prisma.lessonNote.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Lesson note not found');
    }

    await this.prisma.lessonNote.delete({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    return { message: 'Note deleted successfully' };
  }
}

