'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  Calendar,
  Flame,
  Target,
  Bookmark,
  BookmarkCheck,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CourseSectionLesson {
  id: string;
  title?: string;
  durationMinutes?: number;
}

interface CourseSection {
  id?: string;
  title?: string;
  lessons?: CourseSectionLesson[];
}

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
    enrolledAt?: string;
    completedAt?: string | null;
    course: {
      id: string;
      title: string;
      slug: string;
      description?: string;
      author: { fullName: string };
      category?: { name: string };
      institution?: { name: string; slug: string };
      sections?: CourseSection[];
    };
  }>;
  recentLessons: Array<{
    id: string;
    completedAt: string;
    lesson: {
      id: string;
      title: string;
      durationMinutes?: number;
      section: {
        id?: string;
        title?: string;
        course: { id?: string; title: string; slug: string };
      };
    };
  }>;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    dueDate?: string;
    maxScore?: number;
    lesson: {
      id?: string;
      title?: string;
      section: {
        course: { id: string; title: string; slug?: string };
      };
    };
    submissions: Array<{ id?: string; status: string; grade?: number }>;
  }>;
  recentQuizAttempts: Array<{
    id: string;
    score: number;
    passed: boolean;
    attemptedAt: string;
    quiz: {
      id?: string;
      title: string;
      passingScore: number;
      lesson: {
        id?: string;
        title?: string;
        section: {
          course: { id?: string; title: string; slug: string };
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

interface PublicCourseItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty?: string;
  estimatedHours?: number;
  price?: number;
  author: { fullName: string };
  category?: { name: string };
}

interface StudentLearningGoal {
  weeklyLessonTarget: number;
  streakDays: number;
  lastActiveDate: string;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const [courseFilter, setCourseFilter] = useState<'all' | 'in-progress' | 'completed'>('in-progress');
  const [assessmentTab, setAssessmentTab] = useState<'assignments' | 'quizzes'>('assignments');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState<number>(5);

  // Local storage keys scoped to user
  const goalStorageKey = user?.id ? `eduverse_goals_${user.id}` : 'eduverse_goals_default';
  const savedCoursesKey = user?.id ? `eduverse_saved_courses_${user.id}` : 'eduverse_saved_courses_default';

  // Learning Goal State
  const [learningGoal, setLearningGoal] = useState<StudentLearningGoal>({
    weeklyLessonTarget: 5,
    streakDays: 3,
    lastActiveDate: new Date().toISOString().slice(0, 10),
  });

  // Saved Courses State
  const [savedCourseIds, setSavedCourseIds] = useState<string[]>([]);

  // Hydrate Goal and Saved Courses from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedGoal = localStorage.getItem(goalStorageKey);
      if (savedGoal) {
        setLearningGoal(JSON.parse(savedGoal));
      } else {
        setLearningGoal({
          weeklyLessonTarget: 5,
          streakDays: 4,
          lastActiveDate: new Date().toISOString().slice(0, 10),
        });
      }

      const savedList = localStorage.getItem(savedCoursesKey);
      if (savedList) {
        setSavedCourseIds(JSON.parse(savedList));
      }
    } catch (e) {
      console.warn('Could not read saved student preferences:', e);
    }
  }, [goalStorageKey, savedCoursesKey]);

  // Save Goal to LocalStorage
  const handleSaveGoal = (target: number) => {
    const updated = {
      ...learningGoal,
      weeklyLessonTarget: Math.max(1, Math.min(30, target)),
    };
    setLearningGoal(updated);
    setIsEditingGoal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(goalStorageKey, JSON.stringify(updated));
    }
  };

  // Toggle Saved Course (Wishlist)
  const toggleSaveCourse = (courseId: string) => {
    setSavedCourseIds((prev) => {
      const next = prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId];
      if (typeof window !== 'undefined') {
        localStorage.setItem(savedCoursesKey, JSON.stringify(next));
      }
      return next;
    });
  };

  // 1. Fetch Primary Dashboard Data
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

  // 2. Fetch Announcements
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

  // 3. Fetch Unread Notifications Count
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: () => apiClient.get('/notifications/unread-count'),
    enabled: !!user?.id,
  });

  // 4. Fetch Course Catalog (for Saved Courses and recommendations)
  const { data: catalogData } = useQuery<{ courses?: PublicCourseItem[] } | PublicCourseItem[]>({
    queryKey: ['course-catalog-preview'],
    queryFn: () => apiClient.get('/courses?limit=8'),
  });

  const catalogCourses: PublicCourseItem[] = Array.isArray(catalogData)
    ? catalogData
    : catalogData?.courses || [];

  // Filtered Saved Courses
  const savedCourses = useMemo(() => {
    return catalogCourses.filter((c) => savedCourseIds.includes(c.id));
  }, [catalogCourses, savedCourseIds]);

  // Primary Course to Continue Learning
  const continueLearningCourse = useMemo(() => {
    if (!data?.recentEnrollments || data.recentEnrollments.length === 0) return null;
    // Prefer course with progress between 1% and 99%, or the most recently enrolled
    const active = data.recentEnrollments.find(
      (e) => e.progressPercentage > 0 && e.progressPercentage < 100,
    );
    return active || data.recentEnrollments[0];
  }, [data?.recentEnrollments]);

  // Filtered Enrolled Courses
  const filteredEnrollments = useMemo(() => {
    if (!data?.recentEnrollments) return [];
    if (courseFilter === 'in-progress') {
      return data.recentEnrollments.filter((e) => e.progressPercentage < 100);
    }
    if (courseFilter === 'completed') {
      return data.recentEnrollments.filter((e) => e.progressPercentage >= 100);
    }
    return data.recentEnrollments;
  }, [data?.recentEnrollments, courseFilter]);

  // Calculate lessons completed this week for Goal Tracking
  const lessonsCompletedThisWeek = useMemo(() => {
    if (!data?.recentLessons) return 0;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return data.recentLessons.filter((l) => new Date(l.completedAt) >= oneWeekAgo).length;
  }, [data?.recentLessons]);

  // Combined Recent Activity Timeline (Lessons, Quizzes, Certificates, Announcements)
  const combinedActivities = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'LESSON' | 'QUIZ' | 'CERTIFICATE' | 'ANNOUNCEMENT';
      title: string;
      subtitle: string;
      timestamp: string;
      link?: string;
      badgeText?: string;
      badgeVariant?: 'orange' | 'amber' | 'destructive' | 'secondary' | 'outline';
    }> = [];

    // Lessons completed
    (data?.recentLessons || []).slice(0, 4).forEach((l) => {
      list.push({
        id: `les-${l.id}`,
        type: 'LESSON',
        title: `Completed lesson: ${l.lesson.title}`,
        subtitle: l.lesson.section?.course?.title || 'Course lesson',
        timestamp: l.completedAt,
        link: l.lesson.section?.course?.slug
          ? `/courses/${l.lesson.section.course.slug}/learn`
          : undefined,
        badgeText: 'Lesson Completed',
        badgeVariant: 'secondary',
      });
    });

    // Quiz attempts
    (data?.recentQuizAttempts || []).slice(0, 3).forEach((q) => {
      list.push({
        id: `qz-${q.id}`,
        type: 'QUIZ',
        title: `Quiz: ${q.quiz.title}`,
        subtitle: `Scored ${q.score}% (Pass threshold: ${q.quiz.passingScore}%)`,
        timestamp: q.attemptedAt,
        link: q.quiz.lesson?.section?.course?.slug
          ? `/courses/${q.quiz.lesson.section.course.slug}/learn`
          : undefined,
        badgeText: q.passed ? 'Quiz Passed' : 'Retry Needed',
        badgeVariant: q.passed ? 'orange' : 'destructive',
      });
    });

    // Certificates earned
    (data?.earnedCertificates || []).slice(0, 2).forEach((c) => {
      list.push({
        id: `cert-${c.id}`,
        type: 'CERTIFICATE',
        title: `Certificate Issued: ${c.course.title}`,
        subtitle: `Credential ID: ${c.verificationCode}`,
        timestamp: c.issuedAt,
        link: `/app/certificates`,
        badgeText: 'Credential Earned',
        badgeVariant: 'amber',
      });
    });

    // Sort descending by timestamp
    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ).slice(0, 6);
  }, [data]);

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header & Quick Shortcuts Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-orange bg-orange-50 dark:bg-orange-950/60 dark:text-orange-400 px-2 py-0.5 rounded border border-brand-orange/20">
              Student Academic Workspace
            </span>
            <span className="text-[11px] text-brand-slate dark:text-slate-400">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-white tracking-tight">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Learner'}
          </h1>
          <p className="text-xs text-brand-slate dark:text-slate-400 mt-0.5">
            Track your course progress, upcoming assessments, study goals, and campus activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/ai-tutor">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <BookOpenCheck className="h-4 w-4 text-brand-orange" />
              <span>AI Study Tutor</span>
            </Button>
          </Link>
          <Link href="/app/notes">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <StickyNote className="h-4 w-4 text-brand-orange" />
              <span>Study Notebook</span>
            </Button>
          </Link>
          <Link href="/courses">
            <Button variant="orange" size="sm" className="gap-2 text-xs">
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

      {/* 2. Primary Hero Feature: "Continue Learning" Quick-Launch Card */}
      {continueLearningCourse && (
        <Card className="border-brand-border dark:border-stone-800 bg-gradient-to-r from-orange-50/70 via-orange-50/30 to-white dark:from-stone-900 dark:via-stone-900/90 dark:to-stone-950 overflow-hidden shadow-xs">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="orange" className="text-[10px] font-bold">
                    Continue Where You Left Off
                  </Badge>
                  {continueLearningCourse.course.category && (
                    <span className="text-[11px] text-brand-slate dark:text-slate-400 font-medium">
                      • {continueLearningCourse.course.category.name}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-brand-coffee dark:text-white leading-tight">
                    {continueLearningCourse.course.title}
                  </h2>
                  <p className="text-xs text-brand-slate dark:text-slate-300 mt-1 flex items-center gap-2">
                    <span>Instructor: {continueLearningCourse.course.author.fullName}</span>
                    {continueLearningCourse.course.institution && (
                      <span>• {continueLearningCourse.course.institution.name}</span>
                    )}
                  </p>
                </div>

                {/* Progress Bar & Counter */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-brand-coffee dark:text-slate-200">
                      Curriculum Completion
                    </span>
                    <span className="text-brand-orange font-extrabold">
                      {Math.round(continueLearningCourse.progressPercentage)}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-200/80 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-brand-orange h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, continueLearningCourse.progressPercentage))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-col lg:items-end justify-center gap-2.5 shrink-0">
                <Link href={`/courses/${continueLearningCourse.course.slug}/learn`} className="w-full sm:w-auto">
                  <Button variant="orange" size="lg" className="w-full sm:w-auto gap-2 text-sm font-bold shadow-sm">
                    <PlayCircle className="h-5 w-5" />
                    <span>Resume Course</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href={`/app/ai-tutor`}
                    className="flex-1 sm:flex-initial"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8">
                      <BookOpenCheck className="h-3.5 w-3.5 text-brand-orange" />
                      <span>Ask AI Tutor</span>
                    </Button>
                  </Link>
                  <Link
                    href={`/app/notes`}
                    className="flex-1 sm:flex-initial"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8">
                      <StickyNote className="h-3.5 w-3.5 text-brand-orange" />
                      <span>Notebook</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Metrics Telemetry Row & Learning Goals Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Metric 1: Enrolled Courses */}
        <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate dark:text-slate-400 text-xs font-semibold">
              <span>Active Enrollments</span>
              <BookOpen className="h-4 w-4 text-brand-orange" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-white">
                {data?.stats.enrolledCount ?? 0}
              </div>
            )}
            <span className="text-[10px] text-brand-slate dark:text-slate-400 block">
              {data?.stats.completedCount ?? 0} completed • {(data?.stats.enrolledCount ?? 0) - (data?.stats.completedCount ?? 0)} in progress
            </span>
          </CardContent>
        </Card>

        {/* Metric 2: Completed Lessons */}
        <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate dark:text-slate-400 text-xs font-semibold">
              <span>Finished Curricula</span>
              <CheckCircle2 className="h-4 w-4 text-brand-orange" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-orange">
                {data?.stats.completedCount ?? 0}
              </div>
            )}
            <span className="text-[10px] text-brand-slate dark:text-slate-400 block">
              100% finished courses
            </span>
          </CardContent>
        </Card>

        {/* Metric 3: Average Progress */}
        <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate dark:text-slate-400 text-xs font-semibold">
              <span>Average Track Progress</span>
              <TrendingUp className="h-4 w-4 text-brand-orange" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-white">
                {data?.stats.averageProgress ?? 0}%
              </div>
            )}
            <span className="text-[10px] text-brand-slate dark:text-slate-400 block">
              Aggregate completion pace
            </span>
          </CardContent>
        </Card>

        {/* Metric 4: Verified Certificates */}
        <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
          <CardContent className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between text-brand-slate dark:text-slate-400 text-xs font-semibold">
              <span>Earned Credentials</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {data?.stats.certificatesCount ?? 0}
              </div>
            )}
            <span className="text-[10px] text-brand-slate dark:text-slate-400 block">
              Digital verified certificates
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 4. Weekly Learning Goals & Study Streak Widget */}
      <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-brand-orange flex items-center justify-center shrink-0 shadow-xs">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-coffee dark:text-white">
                    Weekly Learning Goal
                  </h3>
                  <Badge variant="orange" className="text-[10px] gap-1 py-0">
                    <Flame className="h-3 w-3 fill-orange-500" />
                    <span>{learningGoal.streakDays}-Day Streak</span>
                  </Badge>
                </div>
                <p className="text-xs text-brand-slate dark:text-slate-400 mt-0.5">
                  Target: Complete <strong>{learningGoal.weeklyLessonTarget} lessons</strong> this week.
                  Current pace: <strong>{lessonsCompletedThisWeek} completed</strong>.
                </p>
              </div>
            </div>

            {/* Progress indicator & target controls */}
            <div className="flex items-center gap-4">
              <div className="w-36 sm:w-48 space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-brand-slate dark:text-slate-400">Goal Progress</span>
                  <span className="text-brand-orange">
                    {Math.min(100, Math.round((lessonsCompletedThisWeek / learningGoal.weeklyLessonTarget) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-orange h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(5, (lessonsCompletedThisWeek / learningGoal.weeklyLessonTarget) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {isEditingGoal ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={customGoalInput}
                    onChange={(e) => setCustomGoalInput(parseInt(e.target.value) || 1)}
                    className="w-14 h-8 px-2 text-xs border border-brand-border rounded bg-white dark:bg-stone-800 dark:border-stone-700 text-brand-coffee dark:text-white"
                  />
                  <Button
                    variant="orange"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => handleSaveGoal(customGoalInput)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setIsEditingGoal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    setCustomGoalInput(learningGoal.weeklyLessonTarget);
                    setIsEditingGoal(true);
                  }}
                >
                  Adjust Target
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Enrolled Courses Section with Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-brand-coffee dark:text-white">
              My Enrolled Courses
            </h2>
            <p className="text-xs text-brand-slate dark:text-slate-400">
              Continue your coursework with real-time lesson progress bars.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg border border-brand-border dark:border-stone-800 self-start sm:self-auto">
            <button
              onClick={() => setCourseFilter('in-progress')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                courseFilter === 'in-progress'
                  ? 'bg-white dark:bg-stone-900 text-brand-orange shadow-xs'
                  : 'text-brand-slate dark:text-slate-400 hover:text-brand-coffee'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setCourseFilter('completed')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                courseFilter === 'completed'
                  ? 'bg-white dark:bg-stone-900 text-brand-orange shadow-xs'
                  : 'text-brand-slate dark:text-slate-400 hover:text-brand-coffee'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setCourseFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                courseFilter === 'all'
                  ? 'bg-white dark:bg-stone-900 text-brand-orange shadow-xs'
                  : 'text-brand-slate dark:text-slate-400 hover:text-brand-coffee'
              }`}
            >
              All Tracks
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : filteredEnrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEnrollments.map((enr) => {
              const totalLessons = (enr.course.sections || []).reduce(
                (sum, s) => sum + (s.lessons || []).length,
                0,
              );
              const isCompleted = enr.progressPercentage >= 100;

              return (
                <Card
                  key={enr.id}
                  className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-orange/40 transition-colors"
                >
                  <CardContent className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        {enr.course.category && (
                          <Badge variant="secondary" className="text-[10px]">
                            {enr.course.category.name}
                          </Badge>
                        )}
                        <h3 className="font-bold text-brand-coffee dark:text-white text-base line-clamp-1">
                          {enr.course.title}
                        </h3>
                        <p className="text-xs text-brand-slate dark:text-slate-400">
                          {enr.course.author.fullName}
                        </p>
                      </div>
                      <Badge
                        variant={isCompleted ? 'default' : 'orange'}
                        className="text-xs font-bold shrink-0"
                      >
                        {Math.round(enr.progressPercentage)}%
                      </Badge>
                    </div>

                    {/* Progress Bar & Details */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-brand-coffee dark:bg-stone-600' : 'bg-brand-orange'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, enr.progressPercentage))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-brand-slate dark:text-slate-400">
                        <span>
                          {totalLessons > 0 ? `${totalLessons} module lessons` : 'Continuous curriculum'}
                        </span>
                        <span className="font-medium">
                          {isCompleted ? 'Finished' : 'In Progress'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-brand-border dark:border-stone-800 text-xs">
                      <span className="text-[11px] text-brand-slate dark:text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Enrolled {enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString() : 'Active'}</span>
                      </span>

                      <Link
                        href={`/courses/${enr.course.slug}/learn`}
                        className="font-bold text-brand-orange hover:underline inline-flex items-center gap-1"
                      >
                        <span>{isCompleted ? 'Review Lessons' : 'Continue'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No Courses in this View"
            description={
              courseFilter === 'completed'
                ? 'You have not completed any courses yet. Finish all lessons to earn credentials!'
                : 'Explore our catalog to enroll in accredited curricula.'
            }
            actionHref="/courses"
            actionLabel="Explore Course Catalog"
          />
        )}
      </div>

      {/* 6. Upcoming Assessments: Assignments & Quizzes Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-brand-coffee dark:text-white">
              Upcoming Assessments & Checks
            </h2>
            <p className="text-xs text-brand-slate dark:text-slate-400">
              Deliver project submissions and test concept comprehension.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg border border-brand-border dark:border-stone-800 self-start sm:self-auto">
            <button
              onClick={() => setAssessmentTab('assignments')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                assessmentTab === 'assignments'
                  ? 'bg-white dark:bg-stone-900 text-brand-orange shadow-xs'
                  : 'text-brand-slate dark:text-slate-400 hover:text-brand-coffee'
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Assignments</span>
            </button>
            <button
              onClick={() => setAssessmentTab('quizzes')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                assessmentTab === 'quizzes'
                  ? 'bg-white dark:bg-stone-900 text-brand-orange shadow-xs'
                  : 'text-brand-slate dark:text-slate-400 hover:text-brand-coffee'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Quizzes</span>
            </button>
          </div>
        </div>

        {assessmentTab === 'assignments' ? (
          <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
            <CardContent className="p-4 divide-y divide-brand-border dark:divide-stone-800">
              {isLoading ? (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : data?.upcomingAssignments && data.upcomingAssignments.length > 0 ? (
                data.upcomingAssignments.map((a) => {
                  const sub = a.submissions?.[0];
                  const hasGrade = sub?.grade !== undefined && sub?.grade !== null;

                  return (
                    <div
                      key={a.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-sm font-bold text-brand-coffee dark:text-white block">
                          {a.title}
                        </strong>
                        <span className="text-brand-slate dark:text-slate-400 text-xs block">
                          Course: {a.lesson?.section?.course?.title || 'Enrolled Course'}
                        </span>
                        {a.dueDate && (
                          <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 pt-0.5">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {hasGrade ? (
                          <Badge variant="orange" className="text-xs">
                            Graded: {sub.grade} / {a.maxScore || 100}
                          </Badge>
                        ) : sub ? (
                          <Badge variant="secondary" className="text-xs">
                            Submitted • Review Pending
                          </Badge>
                        ) : (
                          <Badge variant="orange" className="text-xs">
                            Pending Due
                          </Badge>
                        )}

                        <Link
                          href={
                            a.lesson?.section?.course?.slug
                              ? `/courses/${a.lesson.section.course.slug}/learn`
                              : '/app/assignments'
                          }
                        >
                          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-brand-slate dark:text-slate-400 space-y-1">
                  <p className="font-semibold text-brand-coffee dark:text-white">All caught up on assignments!</p>
                  <p>No pending submission deadlines for your enrolled curricula.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
            <CardContent className="p-4 divide-y divide-brand-border dark:divide-stone-800">
              {isLoading ? (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : data?.recentQuizAttempts && data.recentQuizAttempts.length > 0 ? (
                data.recentQuizAttempts.map((q) => (
                  <div
                    key={q.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <strong className="text-sm font-bold text-brand-coffee dark:text-white block">
                        {q.quiz.title}
                      </strong>
                      <span className="text-brand-slate dark:text-slate-400 text-xs block">
                        Course: {q.quiz.lesson?.section?.course?.title || 'Academic Module'}
                      </span>
                      <span className="text-[11px] text-brand-slate dark:text-slate-400 block pt-0.5">
                        Pass Threshold: <strong>{q.quiz.passingScore}%</strong> • Recorded Score: <strong>{q.score}%</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <Badge
                        variant={q.passed ? 'orange' : 'destructive'}
                        className="text-xs font-bold"
                      >
                        {q.passed ? 'Passed' : 'Retry Needed'}
                      </Badge>
                      <Link
                        href={
                          q.quiz.lesson?.section?.course?.slug
                            ? `/courses/${q.quiz.lesson.section.course.slug}/learn`
                            : '/app/quizzes'
                        }
                      >
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                          <span>{q.passed ? 'Review' : 'Retake'}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-brand-slate dark:text-slate-400 space-y-1">
                  <p className="font-semibold text-brand-coffee dark:text-white">No quiz attempts logged yet.</p>
                  <p>Module quizzes unlock as you progress through course lessons.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 7. Two-Column Grid: Recent Activity Stream & Notifications Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Real-Time Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-coffee dark:text-white">
              Recent Activity Stream
            </h2>
            <Link
              href="/app/recent-lessons"
              className="text-xs font-semibold text-brand-orange hover:underline"
            >
              Full History →
            </Link>
          </div>

          <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
            <CardContent className="p-4 divide-y divide-brand-border dark:divide-stone-800">
              {combinedActivities.length > 0 ? (
                combinedActivities.map((act) => (
                  <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5 overflow-hidden">
                      <div className="mt-0.5 shrink-0">
                        {act.type === 'LESSON' && <PlayCircle className="h-4 w-4 text-brand-orange" />}
                        {act.type === 'QUIZ' && <HelpCircle className="h-4 w-4 text-blue-600" />}
                        {act.type === 'CERTIFICATE' && <Award className="h-4 w-4 text-amber-500" />}
                        {act.type === 'ANNOUNCEMENT' && <Megaphone className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div className="truncate">
                        <strong className="text-brand-coffee dark:text-white block truncate">
                          {act.title}
                        </strong>
                        <span className="text-[11px] text-brand-slate dark:text-slate-400 block truncate">
                          {act.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {act.badgeText && (
                        <Badge
                          variant={act.badgeVariant || 'secondary'}
                          className="text-[10px] block mb-0.5"
                        >
                          {act.badgeText}
                        </Badge>
                      )}
                      <span className="text-[10px] text-brand-slate dark:text-slate-400">
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-brand-slate dark:text-slate-400">
                  No activity recorded yet. Start learning to build your academic trail!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Notifications & Campus Announcements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-brand-coffee dark:text-white">
                Notifications & Announcements
              </h2>
              {unreadData && unreadData.unreadCount > 0 && (
                <Badge variant="orange" className="text-[10px] px-1.5 py-0">
                  {unreadData.unreadCount} Unread
                </Badge>
              )}
            </div>
            <Link
              href="/app/notifications"
              className="text-xs font-semibold text-brand-orange hover:underline"
            >
              All Notifications →
            </Link>
          </div>

          <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
            <CardContent className="p-4 divide-y divide-brand-border dark:divide-stone-800">
              {announcements.length > 0 ? (
                announcements.slice(0, 4).map((ann) => (
                  <div key={ann.id} className="py-3 first:pt-0 last:pb-0 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-bold text-brand-coffee dark:text-white truncate">
                        {ann.title}
                      </strong>
                      <span className="text-[10px] text-brand-slate dark:text-slate-400 shrink-0">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-brand-slate dark:text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                      {ann.content}
                    </p>
                    <div className="flex items-center justify-between pt-0.5 text-[10px] text-brand-slate dark:text-slate-400">
                      <span>By {ann.author?.fullName || 'Course Faculty'}</span>
                      {ann.course && (
                        <Link
                          href={`/courses/${ann.course.slug}/learn`}
                          className="font-bold text-brand-orange hover:underline"
                        >
                          Course Lesson →
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-brand-slate dark:text-slate-400">
                  No unread announcements or campus alerts.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 8. Saved Courses & Study Wishlist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-coffee dark:text-white flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-brand-orange" />
              <span>Saved Courses & Learning Wishlist</span>
            </h2>
            <p className="text-xs text-brand-slate dark:text-slate-400">
              Bookmarks you've pinned for future enrollment and skill development.
            </p>
          </div>
          <Link href="/courses" className="text-xs font-semibold text-brand-orange hover:underline">
            Browse Full Catalog →
          </Link>
        </div>

        {savedCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedCourses.map((c) => (
              <Card
                key={c.id}
                className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-brand-orange/40 transition-colors"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {c.category ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {c.category.name}
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() => toggleSaveCourse(c.id)}
                      className="text-brand-orange hover:opacity-80 p-1"
                      title="Remove from saved"
                    >
                      <BookmarkCheck className="h-4 w-4 fill-orange-500" />
                    </button>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-brand-coffee dark:text-white line-clamp-1">
                      {c.title}
                    </h4>
                    <p className="text-xs text-brand-slate dark:text-slate-400 line-clamp-2 mt-1">
                      {c.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-brand-border dark:border-stone-800 text-xs">
                    <span className="font-bold text-brand-coffee dark:text-white">
                      {c.price ? `${c.price} ETB` : 'Free'}
                    </span>
                    <Link href={`/courses/${c.slug}`}>
                      <Button variant="orange" size="sm" className="h-7 text-xs px-3">
                        View Course
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-orange-100/80 text-brand-orange mx-auto flex items-center justify-center">
                <Bookmark className="h-6 w-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-brand-coffee dark:text-white">
                  Your Learning Wishlist is Empty
                </h3>
                <p className="text-xs text-brand-slate dark:text-slate-400">
                  Save courses while browsing the catalog to build your future study roadmap.
                </p>
              </div>

              {/* Recommended Quick-Saves from Catalog */}
              {catalogCourses.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-brand-coffee dark:text-slate-300 block mb-2">
                    Recommended Curricula to Bookmark:
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {catalogCourses.slice(0, 3).map((rc) => (
                      <Button
                        key={rc.id}
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 h-8"
                        onClick={() => toggleSaveCourse(rc.id)}
                      >
                        <Bookmark className="h-3 w-3 text-brand-orange" />
                        <span className="truncate max-w-[160px]">{rc.title}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
