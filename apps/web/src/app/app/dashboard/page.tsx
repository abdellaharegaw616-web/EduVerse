'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Award,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  Megaphone,
  BookOpenCheck,
  StickyNote,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface DashboardResponse {
  stats: {
    enrolledCount: number;
    completedCount: number;
    averageProgress: number;
    certificatesCount: number;
  };
  recentEnrollments: Array<{
    id: string;
    progressPercentage: number;
    course: {
      id: string;
      title: string;
      slug: string;
      author: { fullName: string };
      category?: { name: string };
    };
  }>;
  recentLessons: Array<{
    id: string;
    completedAt: string;
    lesson: {
      id: string;
      title: string;
      section: {
        course: { title: string; slug: string };
      };
    };
  }>;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    dueDate?: string;
    lesson: {
      section: {
        course: { title: string };
      };
    };
    submissions: Array<{ status: string; grade?: number }>;
  }>;
  recentQuizAttempts: Array<{
    id: string;
    score: number;
    passed: boolean;
    attemptedAt: string;
    quiz: {
      title: string;
      passingScore: number;
      lesson: {
        section: {
          course: { title: string };
        };
      };
    };
  }>;
  earnedCertificates: Array<{
    id: string;
    verificationCode: string;
    issuedAt: string;
    course: { title: string; slug: string };
  }>;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardResponse>({
    queryKey: ['student-dashboard', user?.id],
    queryFn: () => apiClient.get<DashboardResponse>('/enrollments/my/dashboard'),
    enabled: !!user?.id,
  });

  const { data: announcements = [] } = useQuery<
    Array<{
      id: string;
      title: string;
      content: string;
      createdAt: string;
      author: { fullName: string };
      course?: { id: string; title: string; slug: string } | null;
    }>
  >({
    queryKey: ['my-announcements', user?.id],
    queryFn: () => apiClient.get('/announcements/my'),
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Personalized Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Overview & Telemetry
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy dark:text-white">
            Welcome, {user?.fullName || 'Student'}
          </h1>
          <p className="text-xs text-brand-slate dark:text-slate-400 mt-0.5">
            Your real-time academic standing, coursework telemetry, and assessment logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/ai-tutor">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <BookOpenCheck className="h-4 w-4 text-brand-emerald" />
              <span>AI Study Tutor</span>
            </Button>
          </Link>
          <Link href="/app/notes">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <StickyNote className="h-4 w-4 text-brand-emerald" />
              <span>Study Notebook</span>
            </Button>
          </Link>
          <Link href="/courses">
            <Button variant="emerald" size="sm" className="gap-2 text-xs">
              <BookOpen className="h-4 w-4" />
              <span>Explore Courses</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Boundary Notice */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Fetch Dashboard Data</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'A network error occurred while connecting to the student API.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-brand-border">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate text-xs">
              <span>Enrolled Courses</span>
              <BookOpen className="h-4 w-4 text-brand-emerald" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
                {data?.stats.enrolledCount ?? 0}
              </div>
            )}
            <span className="text-[10px] text-brand-slate block">Active curricula</span>
          </CardContent>
        </Card>

        <Card className="border-brand-border">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate text-xs">
              <span>Completed</span>
              <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-emerald">
                {data?.stats.completedCount ?? 0}
              </div>
            )}
            <span className="text-[10px] text-brand-slate block">100% finished</span>
          </CardContent>
        </Card>

        <Card className="border-brand-border">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate text-xs">
              <span>Average Progress</span>
              <TrendingUp className="h-4 w-4 text-brand-emerald" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
                {data?.stats.averageProgress ?? 0}%
              </div>
            )}
            <span className="text-[10px] text-brand-slate block">Across all courses</span>
          </CardContent>
        </Card>

        <Card className="border-brand-border">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate text-xs">
              <span>Certificates</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {data?.stats.certificatesCount ?? 0}
              </div>
            )}
            <span className="text-[10px] text-brand-slate block">Verifiable digital credentials</span>
          </CardContent>
        </Card>
      </div>

      {/* 3. In Progress Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy">My Active Courses</h2>
          <Link href="/app/courses" className="text-xs font-semibold text-brand-emerald hover:underline">
            View All Courses
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : data?.recentEnrollments && data.recentEnrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recentEnrollments.map((enr) => (
              <Card key={enr.id} className="border-brand-border hover:border-brand-emerald/40 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {enr.course.category && (
                        <Badge variant="secondary" className="text-[10px] mb-1">
                          {enr.course.category.name}
                        </Badge>
                      )}
                      <h3 className="font-bold text-brand-navy text-sm line-clamp-1">
                        {enr.course.title}
                      </h3>
                      <p className="text-xs text-brand-slate">{enr.course.author.fullName}</p>
                    </div>
                    <span className="text-xs font-extrabold text-brand-emerald">
                      {Math.round(enr.progressPercentage)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-emerald h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, enr.progressPercentage))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-brand-slate">In Progress</span>
                    <Link
                      href={`/courses/${enr.course.slug}/learn`}
                      className="font-semibold text-brand-emerald hover:underline inline-flex items-center gap-1"
                    >
                      <span>Resume</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No Active Enrollments"
            description="You are not currently enrolled in any academic tracks. Explore our catalog to begin your journey."
            actionHref="/courses"
            actionLabel="Browse Course Catalog"
          />
        )}
      </div>

      {/* 4. Two-Column Grid: Recent Lessons & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lessons */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-navy">Recent Lessons</h2>
            <Link href="/app/recent-lessons" className="text-xs font-semibold text-brand-emerald hover:underline">
              View History
            </Link>
          </div>

          <Card className="border-brand-border">
            <CardContent className="p-4 divide-y divide-brand-border">
              {isLoading ? (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : data?.recentLessons && data.recentLessons.length > 0 ? (
                data.recentLessons.map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <PlayCircle className="h-4 w-4 text-brand-emerald shrink-0" />
                      <div className="truncate">
                        <strong className="text-brand-navy block truncate">{item.lesson.title}</strong>
                        <span className="text-brand-slate truncate block">
                          {item.lesson.section.course.title}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-brand-slate shrink-0">
                      {new Date(item.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-brand-slate">
                  No lesson records found. Complete lessons to track activity.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines / Assignments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-navy">Upcoming Deadlines</h2>
            <Link href="/app/assignments" className="text-xs font-semibold text-brand-emerald hover:underline">
              View All
            </Link>
          </div>

          <Card className="border-brand-border">
            <CardContent className="p-4 divide-y divide-brand-border">
              {isLoading ? (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : data?.upcomingAssignments && data.upcomingAssignments.length > 0 ? (
                data.upcomingAssignments.map((a) => {
                  const sub = a.submissions[0];
                  return (
                    <div key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                      <div className="overflow-hidden">
                        <strong className="text-brand-navy block truncate">{a.title}</strong>
                        <span className="text-brand-slate truncate block">{a.lesson.section.course.title}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        {sub ? (
                          <Badge variant="emerald" className="text-[10px]">
                            {sub.status}
                          </Badge>
                        ) : (
                          <Badge variant="amber" className="text-[10px]">
                            Pending Due
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-brand-slate">
                  No pending assignments or immediate deadlines.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Assessment Logs & Earned Certificates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quizzes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-navy">Recent Quiz Attempts</h2>
            <Link href="/app/quizzes" className="text-xs font-semibold text-brand-emerald hover:underline">
              Quiz History
            </Link>
          </div>

          <Card className="border-brand-border">
            <CardContent className="p-4 divide-y divide-brand-border">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : data?.recentQuizAttempts && data.recentQuizAttempts.length > 0 ? (
                data.recentQuizAttempts.map((q) => (
                  <div key={q.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <strong className="text-brand-navy block">{q.quiz.title}</strong>
                      <span className="text-brand-slate text-[10px]">
                        Pass: {q.quiz.passingScore}% • Score: <strong>{q.score}%</strong>
                      </span>
                    </div>
                    {q.passed ? (
                      <Badge variant="emerald" className="text-[10px]">Passed</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Retry Needed</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-brand-slate">
                  No quizzes taken yet. Test your knowledge in course modules.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Earned Certificates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-navy">Earned Credentials</h2>
            <Link href="/app/certificates" className="text-xs font-semibold text-brand-emerald hover:underline">
              View All
            </Link>
          </div>

          <Card className="border-brand-border">
            <CardContent className="p-4 divide-y divide-brand-border">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-8" />
                </div>
              ) : data?.earnedCertificates && data.earnedCertificates.length > 0 ? (
                data.earnedCertificates.map((c) => (
                  <div key={c.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <strong className="text-brand-navy block">{c.course.title}</strong>
                        <span className="text-brand-slate text-[10px] font-mono">
                          ID: {c.verificationCode}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-brand-slate">
                  Complete 100% of an accredited curriculum to earn verifiable credentials.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. Course & Campus Announcements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand-emerald" />
            <span>Course Announcements</span>
          </h2>
          <Link href="/app/notifications" className="text-xs font-semibold text-brand-emerald hover:underline">
            Notification Feed
          </Link>
        </div>

        <Card className="border-brand-border dark:border-slate-800">
          <CardContent className="p-4 divide-y divide-brand-border dark:divide-slate-800">
            {announcements.length > 0 ? (
              announcements.slice(0, 5).map((ann) => (
                <div key={ann.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-brand-navy dark:text-white">
                        {ann.title}
                      </strong>
                      {ann.course && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ann.course.title}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-brand-slate dark:text-slate-400">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-brand-slate dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-brand-slate dark:text-slate-400">
                      Instructor: {ann.author?.fullName || 'Faculty'}
                    </span>
                    {ann.course && (
                      <Link
                        href={`/courses/${ann.course.slug}/learn`}
                        className="text-[11px] font-semibold text-brand-emerald hover:underline"
                      >
                        Open Course →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-brand-slate dark:text-slate-400">
                No instructor announcements posted for your enrolled courses yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
