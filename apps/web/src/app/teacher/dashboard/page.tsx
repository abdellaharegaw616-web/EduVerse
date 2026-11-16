'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Users,
  FileCheck2,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  Layers,
  Video,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Save,
  Award,
  Search,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
    sectionCount?: number;
    lessonCount?: number;
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
    content?: string | null;
    fileUrl?: string | null;
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
  const queryClient = useQueryClient();

  const [courseFilter, setCourseFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'PENDING_REVIEW'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Quick grading modal state
  const [gradingSubmission, setGradingSubmission] = useState<TeacherDashboardResponse['recentSubmissions'][0] | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [gradeError, setGradeError] = useState<string | null>(null);

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

  // Grade submission mutation
  const gradeMutation = useMutation({
    mutationFn: ({ id, grade, feedback }: { id: string; grade: number; feedback: string }) =>
      apiClient.patch(`/courses/teacher/assignments/submissions/${id}/grade`, {
        grade,
        feedback,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-submissions'] });
      setGradingSubmission(null);
      setGradeError(null);
    },
  });

  // AI draft feedback mutation
  const draftFeedbackMutation = useMutation({
    mutationFn: ({ submissionId, proposedGrade }: { submissionId: string; proposedGrade?: number }) =>
      apiClient.post<{ draftFeedback: string }>('/ai/teacher/draft-feedback', {
        submissionId,
        proposedGrade,
      }),
    onSuccess: (res) => {
      setFeedbackInput(res.draftFeedback);
    },
  });

  const openGradingModal = (sub: TeacherDashboardResponse['recentSubmissions'][0]) => {
    setGradingSubmission(sub);
    setGradeInput(Math.round(sub.assignment.maxScore * 0.85));
    setFeedbackInput('');
    setGradeError(null);
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    if (gradeInput < 0 || gradeInput > gradingSubmission.assignment.maxScore) {
      setGradeError(`Grade must be between 0 and ${gradingSubmission.assignment.maxScore} points.`);
      return;
    }

    await gradeMutation.mutateAsync({
      id: gradingSubmission.id,
      grade: Number(gradeInput),
      feedback: feedbackInput.trim(),
    });
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!data?.courses) return [];
    return data.courses.filter((c) => {
      const matchesFilter = courseFilter === 'ALL' || c.status === courseFilter;
      const matchesSearch =
        !searchTerm.trim() ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [data?.courses, courseFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <Badge variant="orange" className="text-[10px] uppercase font-bold tracking-wider">
            Published
          </Badge>
        );
      case 'PENDING_REVIEW':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-semibold">
            Under Review
          </Badge>
        );
      case 'DRAFT':
        return (
          <Badge variant="outline" className="bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 text-[10px] font-semibold">
            Draft
          </Badge>
        );
      case 'ARCHIVED':
        return (
          <Badge variant="secondary" className="text-[10px]">
            Archived
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <span>Academic Faculty & Instructor Studio</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100 mt-1">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Professor'}
          </h1>
          <p className="text-xs text-brand-slate dark:text-stone-400 mt-0.5">
            Manage course curriculums, organize lecture resources, configure quizzes & assignments, and grade student submissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/teacher/courses/create">
            <Button variant="orange" size="sm" className="gap-2 text-xs font-semibold shadow-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Create Course</span>
            </Button>
          </Link>
          <Link href="/teacher/grading">
            <Button variant="outline" size="sm" className="gap-2 text-xs border-brand-border dark:border-stone-700 hover:border-brand-orange/40">
              <FileCheck2 className="h-4 w-4 text-brand-orange" />
              <span>Review Submissions ({data?.stats.pendingSubmissionsCount || 0})</span>
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

      {/* KPI Telemetry Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Authored Courses */}
          <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-mint text-brand-orange dark:bg-orange-950/40 dark:text-orange-400 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Total Curricula</span>
                <span className="text-2xl font-extrabold text-brand-coffee dark:text-stone-100 leading-none">
                  {data.stats.totalCourses}
                </span>
                <span className="text-[10px] text-brand-slate dark:text-stone-400 mt-1 block">
                  {data.stats.publishedCount} active • {data.stats.draftCount} draft
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Students */}
          <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-mint text-brand-coffee dark:bg-stone-800 dark:text-stone-200 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Total Enrolled Learners</span>
                <span className="text-2xl font-extrabold text-brand-coffee dark:text-stone-100 leading-none">
                  {data.stats.totalStudents}
                </span>
                <span className="text-[10px] text-brand-slate dark:text-stone-400 mt-1 block">
                  Across all active cohorts
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Submissions Queue */}
          <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Awaiting Review</span>
                <span className="text-2xl font-extrabold text-brand-coffee dark:text-stone-100 leading-none">
                  {data.stats.pendingSubmissionsCount}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1 block">
                  {data.stats.pendingSubmissionsCount > 0 ? 'Urgent: grading pending' : 'All submissions graded'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Institutional Quality Review */}
          <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-mint text-brand-orange dark:bg-stone-800 dark:text-orange-400 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-brand-slate dark:text-stone-400 block">Under Review</span>
                <span className="text-2xl font-extrabold text-brand-coffee dark:text-stone-100 leading-none">
                  {data.stats.pendingReviewCount}
                </span>
                <span className="text-[10px] text-brand-slate dark:text-stone-400 mt-1 block">
                  Faculty governance approval
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* 5-Pillar Instructor Tool Navigator */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link href="/teacher/courses/create" className="p-3.5 rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-orange/40 hover:bg-brand-mint/40 dark:hover:bg-stone-800/60 transition-all text-center space-y-1.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-orange dark:bg-stone-800 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <PlusCircle className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-brand-coffee dark:text-stone-100">Create Course</p>
          <p className="text-[10px] text-brand-slate dark:text-stone-400">Draft syllabus & metadata</p>
        </Link>

        <Link href="/teacher/courses" className="p-3.5 rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-orange/40 hover:bg-brand-mint/40 dark:hover:bg-stone-800/60 transition-all text-center space-y-1.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-orange dark:bg-stone-800 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-brand-coffee dark:text-stone-100">Organize Modules</p>
          <p className="text-[10px] text-brand-slate dark:text-stone-400">Structure sections & lessons</p>
        </Link>

        <Link href="/teacher/courses" className="p-3.5 rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-orange/40 hover:bg-brand-mint/40 dark:hover:bg-stone-800/60 transition-all text-center space-y-1.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-orange dark:bg-stone-800 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <Video className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-brand-coffee dark:text-stone-100">Upload Resources</p>
          <p className="text-[10px] text-brand-slate dark:text-stone-400">Video, PDF & lecture slides</p>
        </Link>

        <Link href="/teacher/courses" className="p-3.5 rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-orange/40 hover:bg-brand-mint/40 dark:hover:bg-stone-800/60 transition-all text-center space-y-1.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-orange dark:bg-stone-800 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <HelpCircle className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-brand-coffee dark:text-stone-100">Quizzes & Tasks</p>
          <p className="text-[10px] text-brand-slate dark:text-stone-400">Author tests & assignments</p>
        </Link>

        <Link href="/teacher/grading" className="p-3.5 rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-orange/40 hover:bg-brand-mint/40 dark:hover:bg-stone-800/60 transition-all text-center space-y-1.5 group col-span-2 sm:col-span-1">
          <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-orange dark:bg-stone-800 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <Award className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-brand-coffee dark:text-stone-100">Review Submissions</p>
          <p className="text-[10px] text-brand-slate dark:text-stone-400">Grade & provide feedback</p>
        </Link>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Courses & Curriculum Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-orange" />
                <span>My Courses & Curriculums</span>
              </h2>
              <p className="text-xs text-brand-slate dark:text-stone-400">
                Organize modules, upload learning resources, and track cohort completion metrics.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-brand-slate dark:text-stone-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter courses..."
                  className="h-8 pl-8 text-xs w-36 sm:w-44 border-brand-border dark:border-stone-700"
                />
              </div>

              <Link href="/teacher/courses">
                <Button variant="outline" size="sm" className="h-8 text-xs border-brand-border dark:border-stone-700 gap-1">
                  <span>Directory</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-brand-mint/60 dark:bg-stone-800/60 border border-brand-border dark:border-stone-800 w-fit">
            {(['ALL', 'PUBLISHED', 'DRAFT', 'PENDING_REVIEW'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setCourseFilter(status)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  courseFilter === status
                    ? 'bg-brand-orange text-white shadow-xs'
                    : 'text-brand-coffee dark:text-stone-300 hover:text-brand-orange dark:hover:text-white'
                }`}
              >
                {status === 'ALL'
                  ? 'All Curricula'
                  : status === 'PUBLISHED'
                    ? 'Published'
                    : status === 'DRAFT'
                      ? 'Drafts'
                      : 'Under Review'}
              </button>
            ))}
          </div>

          {/* Course List */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="space-y-4">
              {filteredCourses.map((course) => (
                <Card
                  key={course.id}
                  className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs hover:border-brand-orange/40 transition-colors"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-brand-coffee dark:text-stone-100">
                            {course.title}
                          </h3>
                          {getStatusBadge(course.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-brand-slate dark:text-stone-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-brand-orange" />
                            <strong>{course.studentCount}</strong> Students
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <strong>{course.completedCount}</strong> Completed
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-brand-coffee dark:text-stone-300" />
                            <strong>{course.sectionCount ?? 0}</strong> Modules
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                        <Link href={`/courses/${course.slug}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2">
                            <ExternalLink className="h-3 w-3" />
                            <span>Preview</span>
                          </Button>
                        </Link>
                        <Link href={`/teacher/courses/${course.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5 border-brand-border dark:border-stone-700">
                            Settings
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Progress Bar & Capabilities Shortcuts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-brand-border/60 dark:border-stone-800 text-xs">
                      {/* Cohort Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-brand-slate dark:text-stone-400">
                          <span>Cohort Average Progress:</span>
                          <strong className="text-brand-coffee dark:text-stone-200">{course.averageProgress}%</strong>
                        </div>
                        <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            className="h-full bg-brand-orange rounded-full transition-all duration-300"
                            style={{ width: `${course.averageProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Studio Action Shortcuts */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link href={`/teacher/courses/${course.id}/sections`}>
                          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-brand-border dark:border-stone-700 hover:border-brand-orange/40">
                            <Layers className="h-3 w-3 text-brand-orange" />
                            <span>Curriculum</span>
                          </Button>
                        </Link>

                        <Link href={`/teacher/courses/${course.id}/quizzes`}>
                          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-brand-border dark:border-stone-700 hover:border-brand-orange/40">
                            <HelpCircle className="h-3 w-3 text-brand-orange" />
                            <span>Quizzes</span>
                          </Button>
                        </Link>

                        <Link href={`/teacher/courses/${course.id}/assignments`}>
                          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-brand-border dark:border-stone-700 hover:border-brand-orange/40">
                            <FileCheck2 className="h-3 w-3 text-brand-orange" />
                            <span>Tasks</span>
                          </Button>
                        </Link>

                        <Link href={`/teacher/courses/${course.id}/students`}>
                          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-brand-border dark:border-stone-700 hover:border-brand-orange/40">
                            <Users className="h-3 w-3 text-brand-orange" />
                            <span>Students</span>
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
              icon={BookOpen}
              title="No Courses Matching Your Filter"
              description="Author a new academic curriculum, create modules, upload lecture materials, and author quizzes."
              actionHref="/teacher/courses/create"
              actionLabel="Create First Course"
            />
          )}
        </div>

        {/* Right Column (1 span): Submissions Queue & Student Activity */}
        <div className="space-y-6">
          {/* Priority Submissions Review Queue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-brand-coffee dark:text-stone-100 flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-amber-500" />
                <span>Pending Submissions</span>
              </h2>
              <Link
                href="/teacher/grading"
                className="text-xs font-semibold text-brand-orange hover:underline flex items-center gap-0.5"
              >
                <span>Full Queue</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {isLoading ? (
              <Skeleton className="h-44 rounded-xl" />
            ) : data && data.recentSubmissions.length > 0 ? (
              <div className="space-y-2.5">
                {data.recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs space-y-2 hover:border-brand-orange/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs text-brand-coffee dark:text-stone-100 leading-snug">
                          {sub.assignment.title}
                        </h4>
                        <span className="text-[11px] text-brand-slate dark:text-stone-400 block">
                          {sub.user.fullName} • {sub.assignment.lesson.section.course.title}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] shrink-0">
                        Pending
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-brand-border/60 dark:border-stone-800 text-[10px] text-brand-slate dark:text-stone-400">
                      <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                      <Button
                        type="button"
                        variant="orange"
                        size="sm"
                        onClick={() => openGradingModal(sub)}
                        className="h-6 text-[10px] px-2"
                      >
                        Grade Now →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 text-center text-xs text-brand-slate dark:text-stone-400 space-y-1">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="font-bold text-brand-coffee dark:text-stone-200">Grading Inbox Clear</p>
                <p>Zero pending submissions awaiting instructor review.</p>
              </div>
            )}
          </div>

          {/* Recent Student Enrollments */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-brand-coffee dark:text-stone-100 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-brand-orange" />
              <span>Recent Enrolled Learners</span>
            </h3>

            {isLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : data && data.recentEnrollments.length > 0 ? (
              <div className="rounded-xl border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 divide-y divide-brand-border/60 dark:divide-stone-800 overflow-hidden shadow-xs">
                {data.recentEnrollments.map((enr) => (
                  <div key={enr.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-brand-coffee dark:text-stone-200">{enr.user.fullName}</p>
                      <p className="text-[10px] text-brand-slate dark:text-stone-400 line-clamp-1">{enr.course.title}</p>
                    </div>
                    <span className="text-[10px] text-brand-slate dark:text-stone-400 shrink-0 ml-2">
                      {new Date(enr.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-slate dark:text-stone-400 text-center py-4">No recent student registrations.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Grading Dialog */}
      <Dialog open={Boolean(gradingSubmission)} onOpenChange={(open) => !open && setGradingSubmission(null)}>
        {gradingSubmission && (
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base text-brand-coffee dark:text-stone-100">
                Grade Submission: {gradingSubmission.assignment.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-brand-slate dark:text-stone-400">
                Student: <strong>{gradingSubmission.user.fullName}</strong> ({gradingSubmission.user.email})
                • Course: {gradingSubmission.assignment.lesson.section.course.title}
              </DialogDescription>
            </DialogHeader>

            {/* Submission Content or File Link */}
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-brand-border dark:border-stone-700 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange block">
                Learner Work Submission
              </span>

              {gradingSubmission.content && (
                <div className="whitespace-pre-line text-brand-coffee dark:text-stone-200 leading-relaxed max-h-36 overflow-y-auto">
                  {gradingSubmission.content}
                </div>
              )}

              {gradingSubmission.fileUrl && (
                <div className="pt-2">
                  <a
                    href={gradingSubmission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-orange font-semibold hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View Uploaded Assignment Artifact</span>
                  </a>
                </div>
              )}

              {!gradingSubmission.content && !gradingSubmission.fileUrl && (
                <p className="text-brand-slate dark:text-stone-400 italic">No textual or artifact body provided.</p>
              )}
            </div>

            {/* Numeric Grade Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="gradeScore" className="text-xs font-semibold text-brand-coffee dark:text-stone-200">
                  Assigned Score
                </Label>
                <span className="text-xs text-brand-slate dark:text-stone-400">
                  Maximum: {gradingSubmission.assignment.maxScore} points
                </span>
              </div>
              <Input
                id="gradeScore"
                type="number"
                min={0}
                max={gradingSubmission.assignment.maxScore}
                value={gradeInput}
                onChange={(e) => setGradeInput(Number(e.target.value))}
                className="text-xs h-9 border-brand-border dark:border-stone-700"
              />
            </div>

            {/* Constructive Feedback Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="feedback" className="text-xs font-semibold text-brand-coffee dark:text-stone-200">
                  Constructive Instructor Feedback
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draftFeedbackMutation.isPending}
                  onClick={() =>
                    draftFeedbackMutation.mutate({
                      submissionId: gradingSubmission.id,
                      proposedGrade: Number(gradeInput),
                    })
                  }
                  className="h-6 text-[10px] px-2 gap-1 border-brand-border dark:border-stone-700"
                >
                  {draftFeedbackMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-brand-orange" />
                  )}
                  <span>Draft Feedback with AI</span>
                </Button>
              </div>

              <Textarea
                id="feedback"
                rows={3}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Detail key conceptual strengths, points of improvement, and revision advice..."
                className="text-xs border-brand-border dark:border-stone-700"
              />
            </div>

            {gradeError && (
              <p className="text-xs text-red-600 font-medium">{gradeError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border dark:border-stone-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGradingSubmission(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="orange"
                size="sm"
                disabled={gradeMutation.isPending}
                className="text-xs gap-1.5"
              >
                {gradeMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Record Grade & Notify Student</span>
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
