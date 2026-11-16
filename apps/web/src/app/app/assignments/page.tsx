'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FileCheck2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  BookOpen,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface AssignmentItem {
  id: string;
  title: string;
  instructions: string;
  maxScore: number;
  dueDate: string | null;
  courseTitle: string;
  courseSlug: string;
  lessonTitle: string;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED';
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
}

export default function StudentAssignmentsPage() {
  const {
    data: assignments,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AssignmentItem[]>({
    queryKey: ['my-assignments'],
    queryFn: () => apiClient.get<AssignmentItem[]>('/assignments/my'),
  });

  const gradedCount = assignments?.filter((a) => a.status === 'GRADED').length || 0;
  const underReviewCount = assignments?.filter((a) => a.status === 'SUBMITTED').length || 0;
  const pendingCount = assignments?.filter((a) => a.status === 'PENDING').length || 0;

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Curriculum Coursework & Deliverables
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100 flex items-center gap-2.5">
            <FileCheck2 className="h-7 w-7 text-brand-orange" />
            <span>Assignments & Deadlines</span>
          </h1>
          <p className="text-xs text-brand-slate dark:text-stone-400 mt-1">
            Track submission deadlines, review instructor qualitative feedback, and monitor graded deliverables.
          </p>
        </div>

        <Link href="/app/courses">
          <Button variant="outline" size="sm" className="border-brand-border dark:border-stone-700 hover:border-brand-orange/40 text-xs">
            <BookOpen className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
            <span>My Courses</span>
          </Button>
        </Link>
      </div>

      {/* Overview Stats */}
      {assignments && assignments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Pending Submission</span>
              <span className="text-xl font-extrabold text-brand-coffee dark:text-stone-100 font-mono">{pendingCount}</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-orange-100/70 text-brand-orange dark:bg-orange-950/40 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Under Review</span>
              <span className="text-xl font-extrabold text-brand-coffee dark:text-stone-100 font-mono">{underReviewCount}</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 flex items-center justify-center">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Graded & Evaluated</span>
              <span className="text-xl font-extrabold text-brand-orange font-mono">{gradedCount}</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-orange-100/70 text-brand-orange dark:bg-orange-950/40 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {isError && (
        <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-bold">Unable to Fetch Assignments</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs mt-1">
            <span>{(error as any)?.message || 'Failed to connect to the assignments API.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs border-red-800">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : assignments && assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const isOverdue =
              assignment.dueDate &&
              new Date(assignment.dueDate).getTime() < Date.now() &&
              assignment.status === 'PENDING';

            return (
              <Card
                key={assignment.id}
                className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:shadow transition-shadow"
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand-orange">
                          {assignment.courseTitle}
                        </span>
                        <span className="text-stone-300 dark:text-stone-600">•</span>
                        <span className="text-xs text-brand-slate dark:text-stone-400">
                          {assignment.lessonTitle}
                        </span>
                      </div>
                      <h3 className="font-bold text-brand-coffee dark:text-stone-100 text-base">
                        {assignment.title}
                      </h3>
                      <p className="text-xs text-brand-slate dark:text-stone-400 line-clamp-2 max-w-2xl leading-relaxed">
                        {assignment.instructions}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {assignment.status === 'GRADED' && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800"
                        >
                          <CheckCircle2 className="h-3 w-3 text-brand-orange" />
                          <span>Graded: {assignment.grade}/{assignment.maxScore} pts</span>
                        </Badge>
                      )}
                      {assignment.status === 'SUBMITTED' && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
                        >
                          <Clock className="h-3 w-3 text-brand-orange" />
                          <span>Under Review</span>
                        </Badge>
                      )}
                      {assignment.status === 'PENDING' && (
                        <Badge
                          variant="outline"
                          className={`gap-1 text-xs ${
                            isOverdue
                              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                          }`}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                          ) : (
                            <Clock className="h-3 w-3 text-amber-600" />
                          )}
                          <span>{isOverdue ? 'Overdue Deadline' : 'Action Required'}</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Faculty Feedback Box */}
                  {assignment.status === 'GRADED' && assignment.feedback && (
                    <div className="rounded-xl bg-brand-creamy dark:bg-stone-800/60 border border-brand-border dark:border-stone-700 p-4 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 text-brand-orange font-bold text-[11px] uppercase tracking-wider">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Instructor Feedback & Qualitative Evaluation</span>
                      </div>
                      <p className="text-brand-coffee dark:text-stone-200 leading-relaxed whitespace-pre-line">
                        {assignment.feedback}
                      </p>
                    </div>
                  )}

                  {/* Bottom Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-brand-border dark:border-stone-800 text-xs text-brand-slate dark:text-stone-400">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-orange" />
                        <span>
                          Deadline:{' '}
                          <strong className={isOverdue ? 'text-rose-600 font-semibold' : 'text-brand-coffee dark:text-stone-200'}>
                            {assignment.dueDate
                              ? new Date(assignment.dueDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Self-Paced (No fixed deadline)'}
                          </strong>
                        </span>
                      </span>
                      <span>Max Score: <strong className="text-brand-coffee dark:text-stone-200">{assignment.maxScore} pts</strong></span>
                    </div>

                    <Link href={`/courses/${assignment.courseSlug}/learn`}>
                      <Button variant="orange" size="sm" className="h-8 text-xs gap-1 shadow-sm">
                        <span>{assignment.status === 'PENDING' ? 'Submit Solution' : 'View Assignment'}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileCheck2}
          title="No Assignments Assigned"
          description="Your currently enrolled courses do not have any pending deliverables or coursework tasks."
          actionHref="/app/courses"
          actionLabel="View Courses"
        />
      )}
    </div>
  );
}
