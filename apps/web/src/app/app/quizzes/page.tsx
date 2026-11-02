'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface QuizAttemptItem {
  id: string;
  quizId: string;
  quizTitle: string;
  passingScore: number;
  score: number;
  passed: boolean;
  attemptedAt: string;
  courseTitle: string;
  courseSlug: string;
  lessonTitle: string;
}

export default function StudentQuizzesPage() {
  const {
    data: quizzes,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<QuizAttemptItem[]>({
    queryKey: ['my-quizzes'],
    queryFn: () => apiClient.get<QuizAttemptItem[]>('/assessments/my/quizzes'),
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Assessments
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Quiz History & Evaluations
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Audit your knowledge check scores, pass thresholds, and diagnostic test records.
          </p>
        </div>

        <Link href="/app/courses">
          <Button variant="outline" size="sm">My Courses</Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Fetch Quiz Records</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to retrieve quiz logs.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quizzes Table / Cards */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="rounded-xl border border-brand-border bg-white divide-y divide-brand-border overflow-hidden shadow-sm">
          {quizzes.map((q) => (
            <div key={q.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-brand-emerald block">
                  {q.courseTitle} • {q.lessonTitle}
                </span>
                <h3 className="font-bold text-brand-navy text-sm">{q.quizTitle}</h3>
                <div className="flex items-center gap-3 text-xs text-brand-slate">
                  <span>Passing Score: {q.passingScore}%</span>
                  <span>•</span>
                  <span>Attempted: {new Date(q.attemptedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-lg font-extrabold text-brand-navy block leading-none">
                    {q.score}%
                  </span>
                  <span className="text-[10px] text-brand-slate">Achieved</span>
                </div>

                {q.passed ? (
                  <Badge variant="emerald" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Passed</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Failed</span>
                  </Badge>
                )}

                <Link href={`/courses/${q.courseSlug}`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <span>Retake</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={HelpCircle}
          title="No Quizzes Attempted"
          description="Complete course module lessons to unlock and take practice assessments."
          actionHref="/app/courses"
          actionLabel="View Courses"
        />
      )}
    </div>
  );
}

