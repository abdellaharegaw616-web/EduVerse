'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  BookOpenCheck,
  StickyNote,
  Megaphone,
  Bookmark,
  Maximize2,
  Minimize2,
  FolderDown,
  BookOpen,
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
import { LessonAssignmentCard } from '@/components/learn/lesson-assignment-card';
import { LessonAiTutor } from '@/components/learn/lesson-ai-tutor';
import { LessonNotesPanel } from '@/components/learn/lesson-notes-panel';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [studyTab, setStudyTab] = useState<'ai' | 'notes' | 'resources' | 'announcements'>('ai');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Open sidebar by default on large desktop screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  // Client-side cache: restore last accessed lesson if query parameter wasn't given
  useEffect(() => {
    if (!initialLessonId && slug && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`eduverse_last_lesson_${slug}`);
        if (cached) {
          setActiveLessonId(cached);
        }
      } catch {}
    }
  }, [slug, initialLessonId]);

  // Persist current lesson for instant resume
  useEffect(() => {
    if (activeLessonId && slug && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`eduverse_last_lesson_${slug}`, activeLessonId);
      } catch {}
    }
  }, [activeLessonId, slug]);

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

  // Fetch Course Announcements
  const { data: courseAnnouncements = [] } = useQuery<
    Array<{
      id: string;
      title: string;
      content: string;
      createdAt: string;
      author: { fullName: string };
    }>
  >({
    queryKey: ['course-announcements', playerData?.course?.id],
    queryFn: () =>
      apiClient.get(`/announcements/course/${playerData!.course.id}`),
    enabled: Boolean(playerData?.course?.id),
  });

  // Set default active lesson on syllabus load (Resume from first incomplete lesson)
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

  // 3. Fetch Lesson Bookmark & Personal Note State
  const { data: noteState } = useQuery<{ isBookmarked?: boolean }>({
    queryKey: ['lesson-note', activeLessonId],
    queryFn: () => apiClient.get(`/notes/lesson/${activeLessonId}`),
    enabled: Boolean(activeLessonId),
  });

  const isBookmarked = Boolean(noteState?.isBookmarked);

  // 4. Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: (nextState: boolean) =>
      apiClient.patch(`/notes/lesson/${activeLessonId}/bookmark`, {
        isBookmarked: nextState,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-note', activeLessonId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
    },
  });

  // 5. Complete / Uncomplete Mutation
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
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
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

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVideoEnded = () => {
    if (lessonData && !lessonData.isCompleted) {
      completionMutation.mutate({
        lessonId: lessonData.id,
        markComplete: true,
      });
    }
    if (autoAdvance && lessonData?.nextLesson) {
      handleSelectLesson(lessonData.nextLesson.id);
    }
  };

  // Helper to parse third-party embedded video URLs (YouTube, Vimeo, etc.)
  const getEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const v = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube-nocookie.com/embed/${v}?autoplay=0&rel=0`;
    }
    if (url.includes('youtu.be/')) {
      const v = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube-nocookie.com/embed/${v}?autoplay=0&rel=0`;
    }
    if (url.includes('vimeo.com/')) {
      const v = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${v}`;
    }
    return null;
  };

  if (isPlayerLoading) {
    return (
      <div className="min-h-screen bg-[#120B08] text-stone-100 flex flex-col">
        <div className="h-14 border-b border-[#2D1C15] px-6 flex items-center justify-between">
          <Skeleton className="h-6 w-64 bg-[#23150F]" />
          <Skeleton className="h-6 w-32 bg-[#23150F]" />
        </div>
        <div className="flex-1 flex">
          <div className="w-80 border-r border-[#2D1C15] p-4 space-y-4 hidden md:block">
            <Skeleton className="h-8 w-full bg-[#23150F]" />
            <Skeleton className="h-32 w-full bg-[#23150F]" />
            <Skeleton className="h-32 w-full bg-[#23150F]" />
          </div>
          <div className="flex-1 p-8 space-y-6">
            <Skeleton className="h-96 w-full bg-[#23150F] rounded-xl" />
            <Skeleton className="h-10 w-2/3 bg-[#23150F]" />
            <Skeleton className="h-32 w-full bg-[#23150F]" />
          </div>
        </div>
      </div>
    );
  }

  if (isPlayerError || !playerData) {
    const errorMsg = (playerError as any)?.message || 'Access denied or course not found.';
    return (
      <div className="min-h-screen bg-brand-page flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-brand-border bg-white shadow-lg">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-brand-coffee">Enrollment Required</h2>
            <p className="text-xs text-brand-slate leading-relaxed">
              {errorMsg.includes('enrolled')
                ? 'You are not enrolled in this course yet. Please enroll from the course catalog to access the learning player.'
                : errorMsg}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link href={`/courses/${slug}`}>
                <Button variant="orange" className="w-full text-xs">
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
      return <CheckCircle2 className="h-4 w-4 text-brand-orange shrink-0" />;
    }
    switch (type) {
      case 'TEXT':
        return <FileText className="h-4 w-4 text-stone-400 shrink-0" />;
      case 'PDF_RESOURCE':
      case 'ATTACHMENT':
        return <Download className="h-4 w-4 text-amber-400 shrink-0" />;
      case 'EXTERNAL_RESOURCE':
        return <ExternalLink className="h-4 w-4 text-blue-400 shrink-0" />;
      default:
        return <PlayCircle className="h-4 w-4 text-brand-orange shrink-0" />;
    }
  };

  const embedVideoUrl = getEmbedUrl(lessonData?.videoUrl);

  return (
    <div className="min-h-screen bg-[#120B08] text-stone-100 flex flex-col font-sans selection:bg-brand-orange/30">
      {/* 1. Top Player Navigation Header */}
      {!focusMode && (
        <header className="h-14 border-b border-[#2D1C15] bg-[#19100C] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/app/courses"
              className="text-stone-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs shrink-0"
              title="Return to My Courses"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">My Courses</span>
            </Link>

            <span className="text-[#38241B] hidden sm:inline">|</span>

            <h1 className="font-semibold text-xs sm:text-sm text-stone-100 truncate max-w-xs md:max-w-md">
              {playerData.course.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Progress Tracker */}
            <div className="flex items-center gap-2.5">
              <div className="w-24 sm:w-36 bg-[#2B1B14] rounded-full h-2 overflow-hidden hidden xs:block">
                <div
                  className="bg-gradient-to-r from-orange-600 to-amber-500 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, playerData.progressPercentage))}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-brand-orange">
                {Math.round(playerData.progressPercentage)}%
              </span>
            </div>

            {/* Focus Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className="hidden md:flex text-stone-400 hover:text-stone-100 text-xs gap-1.5 h-8 px-2"
              title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
            >
              {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="text-[11px]">{focusMode ? 'Exit Focus' : 'Focus'}</span>
            </Button>

            {/* Toggle Syllabus Sidebar */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-[#38241B] bg-[#23150F] hover:bg-[#2D1B13] text-stone-200 text-xs gap-1.5 h-8 px-2.5"
            >
              {sidebarOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{sidebarOpen ? 'Hide Syllabus' : 'Syllabus'}</span>
            </Button>
          </div>
        </header>
      )}

      {/* Focus Mode Floating Exit Pill */}
      {focusMode && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFocusMode(false)}
            className="border-[#38241B] bg-[#19100C]/90 text-stone-200 backdrop-blur-md text-xs gap-1.5 h-8 shadow-lg"
          >
            <Minimize2 className="h-3.5 w-3.5 text-brand-orange" />
            <span>Exit Focus Mode</span>
          </Button>
        </div>
      )}

      {/* 2. Main Player Body with Responsive Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Course Content Center Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center pb-24 lg:pb-12">
          <div className="w-full max-w-4xl space-y-6">
            {isLessonLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-96 w-full bg-[#1C120D] rounded-xl" />
                <Skeleton className="h-8 w-1/2 bg-[#1C120D]" />
                <Skeleton className="h-32 w-full bg-[#1C120D]" />
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
                  <div className="space-y-3">
                    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#2D1C15] shadow-2xl flex items-center justify-center">
                      {embedVideoUrl ? (
                        <iframe
                          src={embedVideoUrl}
                          title={lessonData.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : lessonData.videoUrl ? (
                        <video
                          ref={videoRef}
                          src={lessonData.videoUrl}
                          controls
                          onEnded={handleVideoEnded}
                          className="w-full h-full object-contain"
                          poster={playerData.course.thumbnailUrl || undefined}
                        >
                          Your browser does not support HTML5 video playback.
                        </video>
                      ) : (
                        /* Fallback for video lessons waiting for streaming upload */
                        <div className="text-center p-8 space-y-3">
                          <div className="h-14 w-14 rounded-full bg-[#1F130E] text-brand-orange flex items-center justify-center mx-auto border border-[#2D1C15]">
                            <PlayCircle className="h-8 w-8" />
                          </div>
                          <h3 className="font-bold text-sm text-white">Video Lecture Stream</h3>
                          <p className="text-xs text-stone-400 max-w-sm">
                            Live streaming media will appear here. You can follow the structured notes and reading material below.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Video Playback Speed & Auto-Advance Control Toolbar */}
                    {lessonData.videoUrl && !embedVideoUrl && (
                      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#19100C] border border-[#2D1C15] text-xs text-stone-300">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-stone-400">Speed:</span>
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => handleSpeedChange(spd)}
                              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                                playbackSpeed === spd
                                  ? 'bg-brand-orange text-white font-bold'
                                  : 'hover:bg-[#2B1B14] text-stone-300'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-stone-400 select-none">
                          <input
                            type="checkbox"
                            checked={autoAdvance}
                            onChange={(e) => setAutoAdvance(e.target.checked)}
                            className="rounded border-[#38241B] text-brand-orange focus:ring-brand-orange"
                          />
                          <span>Auto-play next lesson</span>
                        </label>
                      </div>
                    )}
                  </div>
                ) : lessonData.type === 'PDF_RESOURCE' ? (
                  <Card className="bg-[#1C120D] border-[#2D1C15] text-white">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="h-16 w-16 rounded-2xl bg-orange-950/40 text-brand-orange flex items-center justify-center mx-auto border border-orange-900/40">
                        <Download className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">{lessonData.title}</h3>
                        <p className="text-xs text-stone-400">
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
                            <Button variant="orange" className="gap-2 text-xs shadow-sm">
                              <Download className="h-4 w-4" />
                              <span>Download Curriculum Document</span>
                            </Button>
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : lessonData.type === 'EXTERNAL_RESOURCE' ? (
                  <Card className="bg-[#1C120D] border-[#2D1C15] text-white">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="h-16 w-16 rounded-2xl bg-blue-950/50 text-blue-400 flex items-center justify-center mx-auto border border-blue-900/40">
                        <ExternalLink className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">{lessonData.title}</h3>
                        <p className="text-xs text-stone-400">
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
                            <Button variant="orange" className="gap-2 text-xs shadow-sm">
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
                <div className="space-y-3 border-b border-[#2D1C15] pb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[11px] font-semibold text-brand-orange uppercase tracking-wider block">
                        {lessonData.sectionTitle}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {lessonData.title}
                      </h2>
                    </div>

                    {/* Bookmark & Completion Action Header Group */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={bookmarkMutation.isPending}
                        onClick={() => bookmarkMutation.mutate(!isBookmarked)}
                        className={`h-10 text-xs gap-1.5 border-[#38241B] transition-colors ${
                          isBookmarked
                            ? 'bg-orange-500/15 border-orange-500/50 text-orange-400'
                            : 'bg-[#19100C] text-stone-300 hover:bg-[#281812]'
                        }`}
                        title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this lesson for revision'}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current text-brand-orange' : ''}`} />
                        <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                      </Button>

                      <Button
                        variant={lessonData.isCompleted ? 'outline' : 'orange'}
                        onClick={handleToggleCompletion}
                        disabled={completionMutation.isPending}
                        className={`text-xs gap-2 h-10 font-bold ${
                          lessonData.isCompleted
                            ? 'border-orange-500/40 text-orange-400 bg-orange-950/20 hover:bg-orange-950/40'
                            : 'bg-brand-orange hover:bg-orange-700 text-white shadow-sm'
                        }`}
                      >
                        {lessonData.isCompleted ? (
                          <>
                            <Check className="h-4 w-4 text-brand-orange" />
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
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-brand-orange" />
                      <span>{lessonData.durationMinutes} min study estimate</span>
                    </span>
                    <Badge variant="outline" className="border-[#38241B] text-stone-300 text-[10px]">
                      {lessonData.type}
                    </Badge>
                    {lessonData.isFreePreview && (
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px]">
                        Free Preview
                      </Badge>
                    )}
                    {lessonData.resources.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-400">
                        <FolderDown className="h-3.5 w-3.5 text-brand-orange" />
                        <span>{lessonData.resources.length} downloadable resource{lessonData.resources.length > 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* C. Lesson Text / Reader Mode */}
                {lessonData.content && (
                  <div className="bg-[#19100C] border border-[#2D1C15] rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#2D1C15] pb-3">
                      <h3 className="text-xs font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Lesson Notes & Guided Syllabus</span>
                      </h3>

                      {/* Text Size Controls for Reader Comfort */}
                      <div className="flex items-center gap-1 text-xs text-stone-400">
                        <span className="text-[11px] mr-1 hidden sm:inline">Text Size:</span>
                        <button
                          type="button"
                          onClick={() => setFontSize('sm')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                            fontSize === 'sm' ? 'bg-brand-orange text-white font-bold' : 'hover:bg-[#281812] text-stone-400'
                          }`}
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSize('base')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                            fontSize === 'base' ? 'bg-brand-orange text-white font-bold' : 'hover:bg-[#281812] text-stone-400'
                          }`}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSize('lg')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                            fontSize === 'lg' ? 'bg-brand-orange text-white font-bold' : 'hover:bg-[#281812] text-stone-400'
                          }`}
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    <div
                      className={`max-w-none text-stone-200 leading-relaxed whitespace-pre-line font-sans ${
                        fontSize === 'sm'
                          ? 'text-xs leading-6'
                          : fontSize === 'lg'
                            ? 'text-base sm:text-lg leading-8'
                            : 'text-xs sm:text-sm leading-7'
                      }`}
                    >
                      {lessonData.content}
                    </div>
                  </div>
                )}

                {/* D. Supplementary Downloadable Resources */}
                {lessonData.resources && lessonData.resources.length > 0 && (
                  <Card className="bg-[#19100C] border-[#2D1C15] text-white">
                    <CardContent className="p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Download className="h-4 w-4 text-brand-orange" />
                        <span>Downloadable Resources ({lessonData.resources.length})</span>
                      </h3>
                      <div className="divide-y divide-[#2D1C15]">
                        {lessonData.resources.map((res) => (
                          <div
                            key={res.id}
                            className="py-3 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-stone-200">{res.title}</span>
                              <p className="text-[11px] text-stone-400 font-mono">
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
                                className="border-[#38241B] text-stone-200 hover:bg-[#281812] text-xs h-8 gap-1.5"
                              >
                                <Download className="h-3.5 w-3.5 text-brand-orange" />
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

                {/* F. Lesson Assignment Deliverable */}
                {lessonData.hasAssignment && lessonData.assignment?.id && (
                  <LessonAssignmentCard
                    assignmentId={lessonData.assignment.id}
                    onSubmitted={() => {
                      if (!lessonData.isCompleted) {
                        handleToggleCompletion();
                      }
                    }}
                  />
                )}

                {/* G. Academic Study Companion (AI Tutor, Study Notes, Resources, & Announcements) */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#2D1C15] pb-3">
                    <button
                      type="button"
                      onClick={() => setStudyTab('ai')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        studyTab === 'ai'
                          ? 'bg-brand-orange text-white'
                          : 'bg-[#19100C] border border-[#2D1C15] text-stone-300 hover:bg-[#23150F]'
                      }`}
                    >
                      <BookOpenCheck className="h-3.5 w-3.5" />
                      <span>AI Study Tutor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudyTab('notes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        studyTab === 'notes'
                          ? 'bg-brand-orange text-white'
                          : 'bg-[#19100C] border border-[#2D1C15] text-stone-300 hover:bg-[#23150F]'
                      }`}
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                      <span>My Study Notes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudyTab('resources')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        studyTab === 'resources'
                          ? 'bg-brand-orange text-white'
                          : 'bg-[#19100C] border border-[#2D1C15] text-stone-300 hover:bg-[#23150F]'
                      }`}
                    >
                      <FolderDown className="h-3.5 w-3.5" />
                      <span>Resources ({lessonData.resources.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudyTab('announcements')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        studyTab === 'announcements'
                          ? 'bg-brand-orange text-white'
                          : 'bg-[#19100C] border border-[#2D1C15] text-stone-300 hover:bg-[#23150F]'
                      }`}
                    >
                      <Megaphone className="h-3.5 w-3.5" />
                      <span>Announcements ({courseAnnouncements.length})</span>
                    </button>
                  </div>

                  {studyTab === 'ai' && (
                    <LessonAiTutor
                      courseId={lessonData.courseId}
                      lessonId={lessonData.id}
                      lessonTitle={lessonData.title}
                      theme="dark"
                    />
                  )}

                  {studyTab === 'notes' && (
                    <LessonNotesPanel
                      lessonId={lessonData.id}
                      lessonTitle={lessonData.title}
                    />
                  )}

                  {studyTab === 'resources' && (
                    <div className="bg-[#19100C] border border-[#2D1C15] rounded-xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#2D1C15] pb-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <FolderDown className="h-4 w-4 text-brand-orange" />
                          <span>Curriculum Materials & Attachments</span>
                        </h3>
                        <span className="text-xs text-stone-400">
                          {lessonData.resources.length} item{lessonData.resources.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {lessonData.resources.length === 0 ? (
                        <p className="text-xs text-stone-400 py-6 text-center">
                          No downloadable attachments attached to this lesson. Check the reading guide above for study code and references.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#2D1C15]">
                          {lessonData.resources.map((res) => (
                            <div key={res.id} className="py-3 flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-stone-200">{res.title}</span>
                                <p className="text-[11px] text-stone-500 font-mono">
                                  {res.fileType} • {Math.round(res.fileSize / 1024)} KB
                                </p>
                              </div>
                              <a href={res.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[#38241B] text-stone-200 hover:bg-[#281812] text-xs h-8 gap-1.5"
                                >
                                  <Download className="h-3.5 w-3.5 text-brand-orange" />
                                  <span>Download</span>
                                </Button>
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {studyTab === 'announcements' && (
                    <div className="bg-[#19100C] border border-[#2D1C15] rounded-xl p-5 sm:p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-brand-orange" />
                        <span>Instructor Announcements</span>
                      </h3>
                      {courseAnnouncements.length === 0 ? (
                        <p className="text-xs text-stone-400 py-6 text-center">
                          No announcements have been posted for this course yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#2D1C15]">
                          {courseAnnouncements.map((ann) => (
                            <div key={ann.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                                <span className="text-[10px] text-stone-400">
                                  {new Date(ann.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-stone-300 whitespace-pre-line leading-relaxed">
                                {ann.content}
                              </p>
                              <span className="text-[10px] text-brand-orange block">
                                Posted by {ann.author?.fullName || 'Course Instructor'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* H. Previous / Next Desktop Navigation Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-[#2D1C15]">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={!lessonData.previousLesson}
                    className="border-[#38241B] bg-[#19100C] text-stone-300 hover:bg-[#281812] text-xs gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous Lesson</span>
                  </Button>

                  <Button
                    variant="orange"
                    onClick={handleNextLesson}
                    disabled={!lessonData.nextLesson}
                    className="text-white text-xs gap-2 shadow-sm"
                  >
                    <span>Next Lesson</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* 3. Collapsible Course Syllabus Sidebar */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-full sm:w-80 md:w-96 lg:static lg:w-96 border-l border-[#2D1C15] bg-[#19100C] flex flex-col shrink-0 transition-all duration-300 ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'
          }`}
        >
          {/* Syllabus Header */}
          <div className="p-4 border-b border-[#2D1C15] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-brand-orange flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Course Syllabus</span>
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {playerData.completedLessons} of {playerData.totalLessons} lessons completed ({Math.round(playerData.progressPercentage)}%)
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-stone-400 hover:text-white lg:hidden h-8 w-8 p-0"
              aria-label="Close Syllabus"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Section Accordions with Lessons */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#2D1C15]/80">
            {playerData.sections.map((section, sIdx) => {
              const isExpanded = expandedSections[section.id] !== false;
              const sectionCompletedCount = section.lessons.filter((l) => l.isCompleted).length;

              return (
                <div key={section.id} className="bg-[#19100C]">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-4 py-3 bg-[#19100C] hover:bg-[#23150F] flex items-center justify-between text-left transition-colors border-b border-[#2D1C15]/40"
                  >
                    <div className="space-y-0.5 pr-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Section {sIdx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-stone-100 line-clamp-1">{section.title}</h4>
                      <p className="text-[10px] text-brand-orange font-mono">
                        {sectionCompletedCount}/{section.lessons.length} completed
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-[#2D1C15]/40 bg-[#120B08]/60">
                      {section.lessons.map((lesson) => {
                        const isActive = lesson.id === activeLessonId;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleSelectLesson(lesson.id)}
                            className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors text-xs ${
                              isActive
                                ? 'bg-orange-500/15 border-l-4 border-brand-orange text-white'
                                : 'hover:bg-[#23150F] text-stone-300'
                            }`}
                          >
                            <div className="mt-0.5">
                              {getLessonIcon(lesson.type, lesson.isCompleted)}
                            </div>
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <span
                                className={`font-medium line-clamp-2 ${
                                  isActive ? 'text-brand-orange font-bold' : 'text-stone-200'
                                }`}
                              >
                                {lesson.title}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono">
                                <span>{lesson.durationMinutes} min</span>
                                {lesson.isFreePreview && (
                                  <span className="text-amber-400 font-bold">Preview</span>
                                )}
                                {lesson.hasQuiz && (
                                  <span className="text-stone-400 font-normal">Quiz</span>
                                )}
                                {lesson.hasAssignment && (
                                  <span className="text-stone-400 font-normal">Task</span>
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

      {/* 4. Mobile Sticky Bottom Navigation Toolbar */}
      <div className="fixed bottom-0 inset-x-0 bg-[#160E0A]/95 backdrop-blur-md border-t border-[#2D1C15] p-2.5 flex items-center justify-between gap-2 z-40 lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousLesson}
          disabled={!lessonData?.previousLesson}
          className="border-[#2D1C15] bg-[#1F130E] text-stone-300 h-9 px-2 text-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:inline">Prev</span>
        </Button>

        <Button
          variant={lessonData?.isCompleted ? 'outline' : 'orange'}
          size="sm"
          onClick={handleToggleCompletion}
          disabled={completionMutation.isPending || !lessonData}
          className={`h-9 px-3 text-xs gap-1.5 flex-1 max-w-[200px] font-bold ${
            lessonData?.isCompleted
              ? 'border-orange-500/40 text-orange-400 bg-orange-950/20'
              : 'bg-brand-orange text-white shadow-sm'
          }`}
        >
          {lessonData?.isCompleted ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Completed</span>
            </>
          ) : (
            <>
              <Circle className="h-3.5 w-3.5" />
              <span>Mark Complete</span>
            </>
          )}
        </Button>

        <Button
          variant="orange"
          size="sm"
          onClick={handleNextLesson}
          disabled={!lessonData?.nextLesson}
          className="text-white h-9 px-2 text-xs"
        >
          <span className="sr-only sm:not-sr-only sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="border-[#2D1C15] bg-[#1F130E] text-stone-300 h-9 px-2.5 text-xs gap-1"
        >
          <Menu className="h-3.5 w-3.5 text-brand-orange" />
          <span>Syllabus</span>
        </Button>
      </div>

      {/* 5. Course 100% Completion Celebration Dialog */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-orange-500/20 text-brand-orange flex items-center justify-center mx-auto border border-orange-500/30">
            <Award className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-black text-brand-coffee">
            Congratulations! Course Completed 🎉
          </DialogTitle>
          <DialogDescription className="text-xs text-brand-slate">
            You have successfully completed 100% of the curriculum in {playerData.course.title}!
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 text-center">
          <p className="text-xs text-brand-slate leading-relaxed">
            Your learning milestones and course completion certificate have been recorded in your EduVerse academic profile.
          </p>
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-coffee">Total Lessons Completed</span>
            <strong className="text-brand-orange font-mono font-bold">
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
            <Button variant="orange" className="text-xs gap-1.5 w-full">
              <Award className="h-3.5 w-3.5" />
              <span>View Verified Certificate</span>
            </Button>
          </Link>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
