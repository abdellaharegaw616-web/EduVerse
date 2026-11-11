import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { PrismaService, Role } from '../database/prisma.service';

describe('NotesService (Personal Study Notebook & Bookmarks)', () => {
  let service: NotesService;
  let prisma: any;

  const studentId = 'student-1';
  const lessonId = 'lesson-1';
  const courseId = 'course-1';

  const mockLesson = {
    id: lessonId,
    title: 'Distributed Consensus & Raft',
    isFreePreview: false,
    section: {
      course: {
        id: courseId,
        authorId: 'teacher-1',
        title: 'Distributed Systems',
        slug: 'distributed-systems',
      },
    },
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      lesson: { findUnique: jest.fn() },
      enrollment: { findUnique: jest.fn() },
      lessonNote: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  it('should deny un-enrolled student from saving notes on private lesson', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: studentId, role: Role.STUDENT, isActive: true });
    prisma.lesson.findUnique.mockResolvedValue(mockLesson);
    prisma.enrollment.findUnique.mockResolvedValue(null);

    await expect(
      service.upsertLessonNote(studentId, lessonId, { content: 'My notes' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should upsert personal study note for enrolled learner', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: studentId, role: Role.STUDENT, isActive: true });
    prisma.lesson.findUnique.mockResolvedValue(mockLesson);
    prisma.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
    prisma.lessonNote.upsert.mockResolvedValue({
      id: 'note-1',
      userId: studentId,
      lessonId,
      courseId,
      content: 'Leader election timeout rules',
      isBookmarked: true,
    });

    const saved = await service.upsertLessonNote(studentId, lessonId, {
      content: 'Leader election timeout rules',
      isBookmarked: true,
    });

    expect(saved.content).toBe('Leader election timeout rules');
    expect(saved.isBookmarked).toBe(true);
    expect(prisma.lessonNote.upsert).toHaveBeenCalled();
  });

  it('should toggle lesson bookmark state cleanly', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: studentId, role: Role.STUDENT, isActive: true });
    prisma.lesson.findUnique.mockResolvedValue({ ...mockLesson, isFreePreview: true });
    prisma.lessonNote.findUnique.mockResolvedValue({ id: 'note-1', isBookmarked: false });
    prisma.lessonNote.upsert.mockResolvedValue({ id: 'note-1', isBookmarked: true });

    const res = await service.toggleBookmark(studentId, lessonId);
    expect(res.isBookmarked).toBe(true);
  });

  it('should list notes filtered by bookmarkedOnly and search term', async () => {
    prisma.lessonNote.findMany.mockResolvedValue([{ id: 'note-1' }]);

    const notes = await service.getMyNotes(studentId, {
      bookmarkedOnly: true,
      search: 'Raft',
    });

    expect(notes).toHaveLength(1);
    expect(prisma.lessonNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: studentId,
          isBookmarked: true,
        }),
      }),
    );
  });

  it('should throw NotFoundException when deleting a nonexistent note', async () => {
    prisma.lessonNote.findUnique.mockResolvedValue(null);

    await expect(service.deleteLessonNote(studentId, lessonId)).rejects.toThrow(NotFoundException);
  });
});

