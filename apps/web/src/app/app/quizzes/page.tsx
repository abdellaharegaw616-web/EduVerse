'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertCircle,
  Clock,
  BookOpen,
  Award,
} from 'lucide-react';
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

  const passedCount = quizzes?.filter((q) => q.passed).length || 0;
  const totalCount = quizzes?.length || 0;
  const avgScore =
    totalCount > 0
      ? Math.round(quizzes!.reduce((acc, curr) => acc + curr.score, 0) / totalCount)
      : 0;

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Assessment & Knowledge Checks
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100 flex items-center gap-2.5">
            <HelpCircle className="h-7 w-7 text-brand-orange" />
            <span>Quiz History & Evaluations</span>
          </h1>
          <p className="text-xs text-brand-slate dark:text-stone-400 mt-1">
            Review your multiple-choice, true/false, and short-answer evaluations with explanations and passing thresholds.
          </p>
        </div>

        <Link href="/app/courses">
          <Button variant="outline" size="sm" className="border-brand-border dark:border-stone-700 hover:border-brand-orange/40 text-xs">
            <BookOpen className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
            <span>My Courses</span>
          </Button>
        </Link>
      </div>

      {/* Metrics Banner */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Total Attempts</span>
              <span className="text-xl font-extrabold text-brand-coffee dark:text-stone-100 font-mono">{totalCount}</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-orange-100/70 text-brand-orange dark:bg-orange-950/40 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Passed Assessments</span>
              <span className="text-xl font-extrabold text-brand-orange font-mono">{passedCount} / {totalCount}</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-orange-100/70 text-brand-orange dark:bg-orange-950/40 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Average Score</span>
              <span className="text-xl font-extrabold text-brand-coffee dark:text-stone-100 font-mono">{avgScore}%</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-orange-100/70 text-brand-orange dark:bg-orange-950/40 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {isError && (
        <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-bold">Unable to Fetch Quiz Records</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs mt-1">
            <span>{(error as any)?.message || 'Failed to retrieve quiz logs.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs border-red-800">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quizzes Table / Cards */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 divide-y divide-brand-border dark:divide-stone-800 overflow-hidden shadow-sm">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-orange-50/20 dark:hover:bg-stone-800/40 transition-colors"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-brand-orange block">
                  {q.courseTitle} • {q.lessonTitle}
                </span>
                <h3 className="font-bold text-brand-coffee dark:text-stone-100 text-sm">{q.quizTitle}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-brand-slate dark:text-stone-400">
                  <span>Passing Threshold: <strong className="text-brand-coffee dark:text-stone-200">{q.passingScore}%</strong></span>
                  <span>•</span>
                  <span>Attempted: {new Date(q.attemptedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <span className={`text-lg font-black block leading-none font-mono ${
                    q.passed ? 'text-brand-orange' : 'text-rose-500'
                  }`}>
                    {q.score}%
                  </span>
                  <span className="text-[10px] text-brand-slate dark:text-stone-400">Score</span>
                </div>

                {q.passed ? (
                  <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-orange" />
                    <span>Passed</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    <span>Failed</span>
                  </Badge>
                )}

                <Link href={`/courses/${q.courseSlug}/learn`}>
                  <Button variant="orange" size="sm" className="h-8 text-xs gap-1 shadow-sm">
                    <span>{q.passed ? 'Review' : 'Retake'}</span>
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
          description="Complete course module lessons to unlock practice quizzes, view scores, and study answer rationales."
          actionHref="/app/courses"
          actionLabel="View Courses"
        />
      )}
    </div>
  );
}
