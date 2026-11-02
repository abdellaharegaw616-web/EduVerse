'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Users,
  FileCheck2,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface TeacherDashboardResponse {
  stats: {
    totalCourses: number;
    publishedCount: number;
    draftCount: number;
    pendingReviewCount: number;
    totalStudents: number;
    pendingSubmissionsCount: number;
  };
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
    studentCount: number;
    completedCount: number;
    averageProgress: number;
    updatedAt: string;
  }>;
  recentEnrollments: Array<{
    id: string;
    enrolledAt: string;
    user: { id: string; fullName: string; email: string };
    course: { id: string; title: string; slug: string };
  }>;
  recentSubmissions: Array<{
    id: string;
    submittedAt: string;
    user: { id: string; fullName: string; email: string };
    assignment: {
      id: string;
      title: string;
      maxScore: number;
      lesson: {
        title: string;
        section: { course: { title: string; slug: string } };
      };
    };
  }>;
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TeacherDashboardResponse>({
    queryKey: ['teacher-dashboard'],
    queryFn: () => apiClient.get<TeacherDashboardResponse>('/courses/teacher/dashboard'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="emerald">Published</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">Pending Review</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Instructor Studio
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Professor'}
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Monitor course enrollment funnels, review pending coursework, and publish modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/teacher/courses/create">
            <Button variant="emerald" size="sm" className="gap-2 text-xs font-semibold shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>Create Course</span>
            </Button>
          </Link>
          <Link href="/teacher/grading">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <FileCheck2 className="h-4 w-4" />
              <span>Review Submissions</span>
            </Button>
          </Link>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Studio Telemetry Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Unable to fetch instructor dashboard records.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-brand-border bg-white shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-slate block">Total Courses</span>
                <span className="text-2xl font-extrabold text-brand-navy leading-none">
                  {data.stats.totalCourses}
                </span>
                <span className="text-[10px] text-brand-slate mt-1 block">
                  {data.stats.publishedCount} published • {data.stats.draftCount} draft
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-border bg-white shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-brand-emerald flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-slate block">Enrolled Learners</span>
                <span className="text-2xl font-extrabold text-brand-navy leading-none">
                  {data.stats.totalStudents}
                </span>
                <span className="text-[10px] text-brand-slate mt-1 block">
                  Across all curriculums
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
                <span className="text-[11px] font-semibold text-brand-slate block">Pending Submissions</span>
                <span className="text-2xl font-extrabold text-brand-navy leading-none">
                  {data.stats.pendingSubmissionsCount}
                </span>
                <span className="text-[10px] text-amber-700 font-medium mt-1 block">
                  Awaiting review & grade
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-border bg-white shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-slate block">Under Review</span>
                <span className="text-2xl font-extrabold text-brand-navy leading-none">
                  {data.stats.pendingReviewCount}
                </span>
                <span className="text-[10px] text-brand-slate mt-1 block">
                  Institutional approval
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Courses Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-emerald" />
              <span>Course Performance & Status</span>
            </h2>
            <Link href="/teacher/courses" className="text-xs font-semibold text-brand-emerald hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : data && data.courses.length > 0 ? (
            <div className="rounded-xl border border-brand-border bg-white divide-y divide-brand-border shadow-xs overflow-hidden">
              {data.courses.map((course) => (
                <div key={course.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-brand-navy">{course.title}</h3>
                      {getStatusBadge(course.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-brand-slate">
                      <span>{course.studentCount} Students Enrolled</span>
                      <span>•</span>
                      <span>{course.completedCount} Completed</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-xs pt-1">
                      <div className="flex justify-between text-[10px] text-brand-slate mb-1">
                        <span>Cohort Avg Progress</span>
                        <span className="font-bold text-brand-navy">{course.averageProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-brand-emerald rounded-full transition-all duration-300"
                          style={{ width: `${course.averageProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link href={`/teacher/courses/${course.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/teacher/courses/${course.id}/sections`}>
                      <Button variant="default" size="sm" className="h-8 text-xs gap-1">
                        <span>Curriculum</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No Courses Authored Yet"
              description="Start drafting your first educational syllabus, upload video lectures, and create auto-graded quizzes."
              actionHref="/teacher/courses/create"
              actionLabel="Create First Course"
            />
          )}
        </div>

        {/* Right Column (1 span): Submissions Queue & Enrollments */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-amber-500" />
              <span>Submissions Queue</span>
            </h2>
            <Link href="/teacher/grading" className="text-xs font-semibold text-brand-emerald hover:underline">
              Grade All
            </Link>
          </div>

          {isLoading ? (
            <Skeleton className="h-44 rounded-xl" />
          ) : data && data.recentSubmissions.length > 0 ? (
            <div className="space-y-2.5">
              {data.recentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-xl border border-brand-border bg-white shadow-xs space-y-2 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-brand-navy leading-snug">
                        {sub.assignment.title}
                      </h4>
                      <span className="text-[11px] text-brand-slate block">
                        {sub.user.fullName} ({sub.assignment.lesson.section.course.title})
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                      Pending
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-brand-border/60 text-[10px] text-brand-slate">
                    <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                    <Link href={`/teacher/grading?id=${sub.id}`}>
                      <span className="text-brand-emerald font-bold hover:underline">
                        Review & Grade →
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-brand-border bg-white text-center text-xs text-brand-slate space-y-1">
              <p className="font-bold text-brand-navy">Inbox Clear</p>
              <p>Zero pending submissions awaiting instructor grading.</p>
            </div>
          )}

          {/* Recent Enrollments */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-brand-navy mb-3 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-brand-emerald" />
              <span>Recent Enrolled Students</span>
            </h3>

            {isLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : data && data.recentEnrollments.length > 0 ? (
              <div className="rounded-xl border border-brand-border bg-white divide-y divide-brand-border/60 overflow-hidden shadow-xs">
                {data.recentEnrollments.map((enr) => (
                  <div key={enr.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-brand-navy">{enr.user.fullName}</p>
                      <p className="text-[10px] text-brand-slate">{enr.course.title}</p>
                    </div>
                    <span className="text-[10px] text-brand-slate">
                      {new Date(enr.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-slate text-center py-4">No recent student registrations.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

