import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

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
}

