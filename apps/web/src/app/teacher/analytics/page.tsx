'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  FileCheck2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CourseOption {
  id: string;
  title: string;
}

interface AnalyticsData {
  courseId: string;
  courseTitle: string;
  totalStudents: number;
  completedStudents: number;
  completionRate: number;
  averageProgress: number;
  totalQuizAttempts: number;
  quizPassRate: number;
  avgQuizScore: number;
  pendingSubmissions: number;
}

export default function CourseAnalyticsPage() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId');

  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || '');

  // 1. Fetch Teacher courses for dropdown
  const { data: coursesData, isLoading: isCoursesLoading } = useQuery<{ items: CourseOption[] }>({
    queryKey: ['teacher-courses-list-analytics'],
    queryFn: () => apiClient.get<{ items: CourseOption[] }>('/courses/teacher/my?limit=50'),
  });

  const courses = coursesData?.items || [];
  const activeCourseId = selectedCourseId || courses[0]?.id;

  // 2. Fetch Analytics for active course
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['teacher-course-analytics', activeCourseId],
    queryFn: () => apiClient.get<AnalyticsData>(`/courses/teacher/${activeCourseId}/analytics`),
    enabled: Boolean(activeCourseId),
  });

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Cohort Analytics
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Course Performance & Funnels
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Examine retention rates, diagnostic quiz averages, and lesson progression telemetry.
          </p>
        </div>

        <Link href="/teacher/courses">
          <Button variant="outline" size="sm">
            My Courses
          </Button>
        </Link>
      </div>

      {/* Course Switcher */}
      {courses.length > 0 && (
        <Card className="border border-brand-border bg-white shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
            <Label htmlFor="courseSelect" className="text-xs font-semibold text-brand-navy whitespace-nowrap">
              Select Course to Analyze:
            </Label>
            <select
              id="courseSelect"
              value={activeCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-navy shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Telemetry Aggregation Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to aggregate course telemetry.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isAnalyticsLoading || isCoursesLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-brand-border bg-white shadow-xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-brand-slate block">Total Cohort</span>
                  <span className="text-2xl font-extrabold text-brand-navy leading-none">
                    {analytics.totalStudents}
                  </span>
                  <span className="text-[10px] text-brand-slate mt-1 block">
                    {analytics.completedStudents} graduated
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-brand-border bg-white shadow-xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand-emerald flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-brand-slate block">Completion Rate</span>
                  <span className="text-2xl font-extrabold text-brand-navy leading-none">
                    {analytics.completionRate}%
                  </span>
                  <span className="text-[10px] text-brand-emerald font-semibold mt-1 block">
                    Verified certs awarded
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-brand-border bg-white shadow-xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-brand-slate block">Quiz Pass Rate</span>
                  <span className="text-2xl font-extrabold text-brand-navy leading-none">
                    {analytics.quizPassRate}%
                  </span>
                  <span className="text-[10px] text-brand-slate mt-1 block">
                    Avg Score: {analytics.avgQuizScore}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-brand-border bg-white shadow-xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-brand-slate block">Grading Backlog</span>
                  <span className="text-2xl font-extrabold text-brand-navy leading-none">
                    {analytics.pendingSubmissions}
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium mt-1 block">
                    Deliverables pending
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deep-dive Breakdown Card */}
          <Card className="border border-brand-border bg-white shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-emerald" />
                <span>Progression & Assessment Insights for {analytics.courseTitle}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Average Progress Metric */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-brand-navy">Cohort Average Course Progress</span>
                  <span className="text-brand-emerald font-bold">{analytics.averageProgress}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-emerald rounded-full transition-all duration-500"
                    style={{ width: `${analytics.averageProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-brand-slate">
                  Calculated from aggregated checkpoints across all reading materials, video lectures, and diagnostic evaluations.
                </p>
              </div>

              {/* Assessment Health Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-brand-border">
                <div className="p-4 rounded-xl bg-slate-50 border border-brand-border space-y-1">
                  <h4 className="font-bold text-xs text-brand-navy">Quiz Health & Diagnostics</h4>
                  <p className="text-xs text-brand-slate">
                    Total Attempts: <strong>{analytics.totalQuizAttempts}</strong>
                  </p>
                  <p className="text-xs text-brand-slate">
                    Pass Ratio: <strong>{analytics.quizPassRate}%</strong> with a mean score of <strong>{analytics.avgQuizScore}%</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-brand-border space-y-1">
                  <h4 className="font-bold text-xs text-brand-navy">Deliverables & Coursework</h4>
                  <p className="text-xs text-brand-slate">
                    Pending Grading Queue: <strong>{analytics.pendingSubmissions}</strong>
                  </p>
                  <Link href="/teacher/grading" className="inline-flex items-center gap-1 text-xs text-brand-emerald font-bold hover:underline pt-1">
                    <span>Open Grading Queue</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No Course Selected"
          description="Create your first curriculum to unlock cohort retention analytics and performance funnels."
          actionHref="/teacher/courses/create"
          actionLabel="Create Course"
        />
      )}
    </div>
  );
}
