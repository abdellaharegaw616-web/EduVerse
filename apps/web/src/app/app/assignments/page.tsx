'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FileCheck2, Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
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

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Coursework & Tasks
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Assignments & Deadlines
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Track pending deliverables, instructor grading evaluations, and feedback.
          </p>
        </div>

        <Link href="/app/courses">
          <Button variant="outline" size="sm">My Courses</Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Fetch Assignments</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to connect to the assignments API.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
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
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="border-brand-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-brand-emerald">
                        {assignment.courseTitle}
                      </span>
                      <span>•</span>
                      <span className="text-xs text-brand-slate">{assignment.lessonTitle}</span>
                    </div>
                    <h3 className="font-bold text-brand-navy text-base">{assignment.title}</h3>
                    <p className="text-xs text-brand-slate line-clamp-2 max-w-2xl leading-relaxed">
                      {assignment.instructions}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {assignment.status === 'GRADED' && (
                      <Badge variant="emerald" className="gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Graded ({assignment.grade}/{assignment.maxScore})</span>
                      </Badge>
                    )}
                    {assignment.status === 'SUBMITTED' && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>Under Review</span>
                      </Badge>
                    )}
                    {assignment.status === 'PENDING' && (
                      <Badge variant="amber" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>Pending Submission</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Grade & Feedback Box if Graded */}
                {assignment.status === 'GRADED' && assignment.feedback && (
                  <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3.5 text-xs space-y-1">
                    <strong className="text-emerald-900 block font-semibold">Faculty Feedback:</strong>
                    <p className="text-emerald-800 leading-relaxed">{assignment.feedback}</p>
                  </div>
                )}

                {/* Bottom Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-brand-border text-xs text-brand-slate">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-brand-emerald" />
                      <span>
                        Due:{' '}
                        {assignment.dueDate
                          ? new Date(assignment.dueDate).toLocaleDateString()
                          : 'Self-Paced'}
                      </span>
                    </span>
                    <span>Max Score: {assignment.maxScore} pts</span>
                  </div>

                  <Link href={`/courses/${assignment.courseSlug}/learn`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <span>View Assignment</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileCheck2}
          title="No Assignments Assigned"
          description="Your currently enrolled courses do not have any pending assignments or tests."
          actionHref="/app/courses"
          actionLabel="View Courses"
        />
      )}
    </div>
  );
}

