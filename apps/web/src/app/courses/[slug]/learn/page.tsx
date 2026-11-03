'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlayCircle,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Award,
  ArrowLeft,
  AlertCircle,
  Clock,
  Check,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { LessonQuizCard } from '@/components/learn/lesson-quiz-card';

interface PlayerLessonSummary {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  type: 'VIDEO' | 'TEXT' | 'PDF_RESOURCE' | 'EXTERNAL_RESOURCE' | 'ATTACHMENT';
  sortOrder: number;
  isFreePreview: boolean;
  isCompleted: boolean;
  hasQuiz: boolean;
  hasAssignment: boolean;
  resourcesCount: number;
}

interface PlayerSection {
  id: string;
  title: string;
  sortOrder: number;
  lessons: PlayerLessonSummary[];
}

interface CoursePlayerResponse {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnailUrl?: string | null;
    author: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
    };
  };
  enrollment: {
    id: string;
    progressPercentage: number;
    completedAt?: string | null;
    enrolledAt: string;
    completedLessons: number;
    totalLessons: number;
  } | null;
  sections: PlayerSection[];
  resumeLesson: PlayerLessonSummary | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

interface LessonDetailResponse {
  id: string;
  title: string;
  slug: string;
  content: string;
  videoUrl?: string | null;
  durationMinutes: number;
  sortOrder: number;
  type: 'VIDEO' | 'TEXT' | 'PDF_RESOURCE' | 'EXTERNAL_RESOURCE' | 'ATTACHMENT';
  isFreePreview: boolean;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  sectionId: string;
  sectionTitle: string;
  resources: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  hasQuiz: boolean;
  quiz?: { id: string; title: string; passingScore: number } | null;
  hasAssignment: boolean;
  assignment?: { id: string; title: string; dueDate?: string } | null;
  isCompleted: boolean;
  previousLesson?: { id: string; title: string; slug: string; type: string } | null;
  nextLesson?: { id: string; title: string; slug: string; type: string } | null;
}

export default function CourseLearningPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const slug = params?.slug as string;
  const initialLessonId = searchParams.get('lesson');

  const [activeLessonId, setActiveLessonId] = useState<string | null>(initialLessonId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // 1. Fetch Course Player Syllabus & Progress
  const {
    data: playerData,
    isLoading: isPlayerLoading,
    isError: isPlayerError,
    error: playerError,
  } = useQuery<CoursePlayerResponse>({
    queryKey: ['course-player', slug],
    queryFn: async () => {
      return apiClient.get<CoursePlayerResponse>(`/courses/${slug}/player`);
    },
    enabled: !!slug,
  });

  // Set default active lesson on syllabus load
  useEffect(() => {
    if (playerData && !activeLessonId) {
      if (playerData.resumeLesson) {
        setActiveLessonId(playerData.resumeLesson.id);
      } else if (playerData.sections?.[0]?.lessons?.[0]) {
        setActiveLessonId(playerData.sections[0].lessons[0].id);
      }
    }
  }, [playerData, activeLessonId]);

  // 2. Fetch Active Lesson Content
  const {
    data: lessonData,
    isLoading: isLessonLoading,
    isError: isLessonError,
    error: lessonError,
  } = useQuery<LessonDetailResponse>({
    queryKey: ['lesson-detail', activeLessonId],
    queryFn: async () => {
      if (!activeLessonId) throw new Error('No lesson selected');
      return apiClient.get<LessonDetailResponse>(`/lessons/${activeLessonId}`);
    },
    enabled: !!activeLessonId,
  });

  // 3. Complete / Uncomplete Mutation
  const completionMutation = useMutation({
    mutationFn: async ({ lessonId, markComplete }: { lessonId: string; markComplete: boolean }) => {
      if (markComplete) {
        return apiClient.post<{
          completed: boolean;
          progressPercentage: number;
          completedLessons: number;
          totalLessons: number;
          courseCompleted: boolean;
        }>(`/lessons/${lessonId}/complete`, {});
      } else {
        return apiClient.delete<{
          completed: boolean;
          progressPercentage: number;
          completedLessons: number;
          totalLessons: number;
          courseCompleted: boolean;
        }>(`/lessons/${lessonId}/complete`);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-player', slug] });
      queryClient.invalidateQueries({ queryKey: ['lesson-detail', activeLessonId] });
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });

      if (data.courseCompleted) {
        setShowCompletionModal(true);
      }
    },
  });

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: prev[secId] === undefined ? false : !prev[secId],
    }));
  };

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    router.replace(`/courses/${slug}/learn?lesson=${lessonId}`, { scroll: false });
  };

  const handleNextLesson = () => {
    if (lessonData?.nextLesson) {
      handleSelectLesson(lessonData.nextLesson.id);
    }
  };

  const handlePreviousLesson = () => {
    if (lessonData?.previousLesson) {
      handleSelectLesson(lessonData.previousLesson.id);
    }
  };

  const handleToggleCompletion = () => {
    if (!lessonData) return;
    completionMutation.mutate({
      lessonId: lessonData.id,
      markComplete: !lessonData.isCompleted,
    });
  };

  if (isPlayerLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between">
          <Skeleton className="h-6 w-64 bg-slate-800" />
          <Skeleton className="h-6 w-32 bg-slate-800" />
        </div>
        <div className="flex-1 flex">
          <div className="w-80 border-r border-slate-800 p-4 space-y-4 hidden md:block">
            <Skeleton className="h-8 w-full bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800" />
          </div>
          <div className="flex-1 p-8 space-y-6">
            <Skeleton className="h-96 w-full bg-slate-800 rounded-xl" />
            <Skeleton className="h-10 w-2/3 bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (isPlayerError || !playerData) {
    const errorMsg = (playerError as any)?.message || 'Access denied or course not found.';
    return (
      <div className="min-h-screen bg-brand-page flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-brand-border shadow-lg">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-brand-navy">Enrollment Required</h2>
            <p className="text-xs text-brand-slate leading-relaxed">
              {errorMsg.includes('enrolled')
                ? 'You are not enrolled in this course yet. Please enroll from the course marketplace to access the learning player.'
                : errorMsg}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link href={`/courses/${slug}`}>
                <Button variant="default" className="w-full text-xs">
                  Go to Course Enrollment
                </Button>
              </Link>
              <Link href="/app/courses">
                <Button variant="outline" className="w-full text-xs">
                  My Enrolled Courses
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getLessonIcon = (type: string, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
    }
    switch (type) {
      case 'TEXT':
        return <FileText className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'PDF_RESOURCE':
      case 'ATTACHMENT':
        return <Download className="h-4 w-4 text-brand-mint shrink-0" />;
      case 'EXTERNAL_RESOURCE':
        return <ExternalLink className="h-4 w-4 text-blue-400 shrink-0" />;
      default:
        return <PlayCircle className="h-4 w-4 text-brand-emerald shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. Top Player Navigation Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/app/courses"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">My Courses</span>
          </Link>

          <span className="text-slate-700 hidden sm:inline">|</span>

          <h1 className="font-semibold text-xs sm:text-sm text-white truncate max-w-xs md:max-w-md">
            {playerData.course.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress Tracker */}
          <div className="flex items-center gap-2.5">
            <div className="w-24 sm:w-36 bg-slate-800 rounded-full h-2 overflow-hidden hidden xs:block">
              <div
                className="bg-brand-emerald h-full transition-all duration-300"
                style={{ width: `${playerData.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-brand-mint">
              {Math.round(playerData.progressPercentage)}%
            </span>
          </div>

          {/* Toggle Syllabus Sidebar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs gap-1.5 h-8 px-2.5"
          >
            {sidebarOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{sidebarOpen ? 'Hide Syllabus' : 'Syllabus'}</span>
          </Button>
        </div>
      </header>

      {/* 2. Main Player Body with Responsive Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Course Content Center Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-6">
            {isLessonLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-96 w-full bg-slate-900 rounded-xl" />
                <Skeleton className="h-8 w-1/2 bg-slate-900" />
                <Skeleton className="h-32 w-full bg-slate-900" />
              </div>
            ) : isLessonError || !lessonData ? (
              <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lesson Inaccessible</AlertTitle>
                <AlertDescription className="text-xs">
                  {(lessonError as any)?.message || 'Failed to load lesson content.'}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* A. Media Player Section */}
                {lessonData.type === 'VIDEO' ? (
                  <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                    {lessonData.videoUrl ? (
                      <video
                        src={lessonData.videoUrl}
                        controls
                        className="w-full h-full object-contain"
                        poster={playerData.course.thumbnailUrl || undefined}
                      >
                        Your browser does not support HTML5 video playback.
                      </video>
                    ) : (
                      /* Fallback for unavailable / streaming media */
                      <div className="text-center p-8 space-y-3">
                        <div className="h-14 w-14 rounded-full bg-slate-900 text-brand-emerald flex items-center justify-center mx-auto border border-slate-800">
                          <PlayCircle className="h-8 w-8" />
                        </div>
                        <h3 className="font-bold text-sm text-white">Video Lecture Stream</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Live streaming media will appear here. You can follow the structured notes and reading material below.
                        </p>
                      </div>
                    )}
                  </div>
                ) : lessonData.type === 'PDF_RESOURCE' ? (
                  <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="h-16 w-16 rounded-2xl bg-brand-navy/60 text-brand-mint flex items-center justify-center mx-auto border border-slate-800">
                        <Download className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">{lessonData.title}</h3>
                        <p className="text-xs text-slate-400">
                          Primary PDF Curriculum Document • {lessonData.durationMinutes} min study estimate
                        </p>
                      </div>
                      {lessonData.resources.length > 0 && (
                        <div className="pt-2">
                          <a
                            href={lessonData.resources[0]?.fileUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="emerald" className="gap-2 text-xs">
                              <Download className="h-4 w-4" />
                              <span>Download Curriculum Document</span>
                            </Button>
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : lessonData.type === 'EXTERNAL_RESOURCE' ? (
                  <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="h-16 w-16 rounded-2xl bg-blue-950/60 text-blue-400 flex items-center justify-center mx-auto border border-slate-800">
                        <ExternalLink className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">{lessonData.title}</h3>
                        <p className="text-xs text-slate-400">
                          External Learning Portal or Interactive Sandbox
                        </p>
                      </div>
                      {lessonData.resources.length > 0 && (
                        <div className="pt-2">
                          <a
                            href={lessonData.resources[0]?.fileUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="default" className="gap-2 text-xs">
                              <ExternalLink className="h-4 w-4" />
                              <span>Launch External Resource</span>
                            </Button>
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* B. Lesson Header & Navigation Controls */}
                <div className="space-y-3 border-b border-slate-800 pb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-brand-mint uppercase tracking-wider">
                        {lessonData.sectionTitle}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-white">
                        {lessonData.title}
                      </h2>
                    </div>

                    {/* Completion Action */}
                    <Button
                      variant={lessonData.isCompleted ? 'outline' : 'default'}
                      onClick={handleToggleCompletion}
                      disabled={completionMutation.isPending}
                      className={`text-xs gap-2 h-10 ${
                        lessonData.isCompleted
                          ? 'border-emerald-600/40 text-emerald-400 hover:bg-emerald-950/30'
                          : 'bg-brand-emerald hover:bg-emerald-600 text-white'
                      }`}
                    >
                      {lessonData.isCompleted ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span>Lesson Completed</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4" />
                          <span>Mark as Complete</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{lessonData.durationMinutes} min</span>
                    </span>
                    <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                      {lessonData.type}
                    </Badge>
                    {lessonData.isFreePreview && (
                      <Badge className="bg-brand-mint/20 text-brand-mint border-brand-mint/30 text-[10px]">
                        Free Preview
                      </Badge>
                    )}
                  </div>
                </div>

                {/* C. Lesson Text / Markdown Notes */}
                {lessonData.content && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-brand-mint uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Lesson Notes & Guidance</span>
                    </h3>
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                      {lessonData.content}
                    </div>
                  </div>
                )}

                {/* D. Supplementary Downloadable Resources */}
                {lessonData.resources && lessonData.resources.length > 0 && (
                  <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardContent className="p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Download className="h-4 w-4 text-brand-mint" />
                        <span>Downloadable Resources ({lessonData.resources.length})</span>
                      </h3>
                      <div className="divide-y divide-slate-800">
                        {lessonData.resources.map((res) => (
                          <div
                            key={res.id}
                            className="py-3 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-200">{res.title}</span>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {res.fileType} • {Math.round(res.fileSize / 1024)} KB
                              </p>
                            </div>
                            <a
                              href={res.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-8 gap-1.5"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download</span>
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* E. Lesson Quiz Assessment */}
                {lessonData.hasQuiz && lessonData.quiz?.id && (
                  <LessonQuizCard
                    quizId={lessonData.quiz.id}
                    onPassed={() => {
                      if (!lessonData.isCompleted) {
                        handleToggleCompletion();
                      }
                    }}
                  />
                )}

                {/* F. Previous / Next Footer Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={!lessonData.previousLesson}
                    className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous Lesson</span>
                  </Button>

                  <Button
                    variant="default"
                    onClick={handleNextLesson}
                    disabled={!lessonData.nextLesson}
                    className="bg-brand-emerald hover:bg-emerald-600 text-white text-xs gap-2"
                  >
                    <span>Next Lesson</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>

        {/* 3. Collapsible Course Syllabus Sidebar */}
        <aside
          className={`w-80 md:w-96 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 transition-all duration-300 z-20 ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 inset-y-0'
          }`}
        >
          {/* Syllabus Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Course Syllabus
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {playerData.completedLessons} of {playerData.totalLessons} lessons completed
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white md:hidden h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Section Accordions with Lessons */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
            {playerData.sections.map((section, sIdx) => {
              const isExpanded = expandedSections[section.id] !== false;
              const sectionCompletedCount = section.lessons.filter((l) => l.isCompleted).length;

              return (
                <div key={section.id} className="bg-slate-900">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-4 py-3 bg-slate-900/90 hover:bg-slate-800/60 flex items-center justify-between text-left transition-colors"
                  >
                    <div className="space-y-0.5 pr-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Section {sIdx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{section.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {sectionCompletedCount}/{section.lessons.length} done
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-slate-800/40 bg-slate-950/40">
                      {section.lessons.map((lesson) => {
                        const isActive = lesson.id === activeLessonId;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleSelectLesson(lesson.id)}
                            className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors text-xs ${
                              isActive
                                ? 'bg-brand-emerald/15 border-l-4 border-brand-emerald text-white'
                                : 'hover:bg-slate-800/40 text-slate-300'
                            }`}
                          >
                            <div className="mt-0.5">
                              {getLessonIcon(lesson.type, lesson.isCompleted)}
                            </div>
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <span
                                className={`font-medium line-clamp-2 ${
                                  isActive ? 'text-brand-mint font-semibold' : 'text-slate-200'
                                }`}
                              >
                                {lesson.title}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                <span>{lesson.durationMinutes} min</span>
                                {lesson.isFreePreview && (
                                  <span className="text-brand-mint">Preview</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* 4. Course 100% Completion Celebration Dialog */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-brand-emerald/20 text-brand-emerald flex items-center justify-center mx-auto border border-brand-emerald/30">
            <Award className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-black text-brand-navy">
            Congratulations! Course Completed 🎉
          </DialogTitle>
          <DialogDescription className="text-xs text-brand-slate">
            You have successfully completed 100% of the lessons in {playerData.course.title}!
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 text-center">
          <p className="text-xs text-brand-slate leading-relaxed">
            Your learning milestones and course completion certificate have been recorded in your EduVerse academic profile.
          </p>
          <div className="p-4 bg-brand-mint/30 rounded-xl border border-brand-emerald/20 flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-navy">Total Lessons Completed</span>
            <strong className="text-brand-emerald font-mono font-bold">
              {playerData.totalLessons} / {playerData.totalLessons} (100%)
            </strong>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCompletionModal(false)}
            className="text-xs w-full sm:w-auto"
          >
            Keep Exploring
          </Button>
          <Link href="/app/certificates" className="w-full sm:w-auto">
            <Button variant="emerald" className="text-xs gap-1.5 w-full">
              <Award className="h-3.5 w-3.5" />
              <span>View Verified Certificate</span>
            </Button>
          </Link>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
