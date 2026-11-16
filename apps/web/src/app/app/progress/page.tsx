'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, BookOpen, CheckCircle2, HelpCircle, FileCheck2, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CourseProgressItem {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  authorName: string;
  progressPercentage: number;
  totalLessons: number;
  completedLessons: number;
  enrolledAt: string;
  completedAt: string | null;
  quizzesTaken: number;
  assignmentsSubmitted: number;
}

export default function LearningProgressPage() {
  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CourseProgressItem[]>({
    queryKey: ['my-learning-progress'],
    queryFn: () => apiClient.get<CourseProgressItem[]>('/enrollments/my/progress'),
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Telemetry & Completion
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100">
            Learning Progress Analytics
          </h1>
          <p className="text-xs text-brand-slate dark:text-stone-400 mt-0.5">
            Audit your lesson completion ratios, assessment milestones, and syllabus trajectories.
          </p>
        </div>

        <Link href="/courses">
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4 text-brand-orange" />
            <span>Catalog</span>
          </Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Fetch Progress Data</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to retrieve progress records.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Cards */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.enrollmentId} className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-brand-coffee dark:text-stone-100 text-base">{item.courseTitle}</h3>
                    <p className="text-xs text-brand-slate dark:text-stone-400">Instructor: {item.authorName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.completedAt ? (
                      <Badge variant="orange">Completed</Badge>
                    ) : (
                      <Badge variant="secondary">In Progress</Badge>
                    )}
                    <span className="text-sm font-extrabold text-brand-orange">
                      {Math.round(item.progressPercentage)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-brand-orange h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.progressPercentage))}%` }}
                  />
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-brand-slate dark:text-stone-400 pt-2 border-t border-brand-border dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-orange shrink-0" />
                    <span>
                      Lessons: <strong>{item.completedLessons}</strong> / {item.totalLessons}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-brand-orange shrink-0" />
                    <span>
                      Quizzes Taken: <strong>{item.quizzesTaken}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-brand-orange shrink-0" />
                    <span>
                      Assignments: <strong>{item.assignmentsSubmitted}</strong>
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <Link href={`/courses/${item.courseSlug}/learn`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-brand-orange hover:bg-orange-50 dark:hover:bg-orange-950/40 gap-1">
                        <span>Continue</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="No Progress Recorded"
          description="Enroll in a course and begin completing lessons to track your learning milestones."
          actionHref="/courses"
          actionLabel="Find Courses"
        />
      )}
    </div>
  );
}

