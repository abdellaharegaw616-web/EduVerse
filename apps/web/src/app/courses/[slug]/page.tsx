'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Users,
  Star,
  CheckCircle2,
  PlayCircle,
  FileText,
  Download,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Globe2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  Send,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface CourseDetails {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  language: string;
  difficulty: string;
  learningObjectives: string[];
  prerequisites: string[];
  estimatedHours: number;
  status: string;
  category?: { id: string; name: string; slug: string } | null;
  institution?: { id: string; name: string; slug: string } | null;
  author: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    bio?: string | null;
    publishedCoursesCount: number;
  };
  stats: {
    enrollmentCount: number;
    reviewCount: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    sectionsCount: number;
    lessonsCount: number;
    totalDurationMinutes: number;
  };
  sections: Array<{
    id: string;
    title: string;
    sortOrder: number;
    lessons: Array<{
      id: string;
      title: string;
      slug: string;
      durationMinutes: number;
      sortOrder: number;
      type: string;
      isFreePreview: boolean;
      hasQuiz: boolean;
      hasAssignment: boolean;
      resources: Array<{
        id: string;
        title: string;
        fileType: string;
        fileSize: number;
      }>;
    }>;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    user: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  const { data: course, isLoading, isError } = useQuery<CourseDetails>({
    queryKey: ['marketplace-course-detail', slug],
    queryFn: async () => {
      return apiClient.request<CourseDetails>(`/marketplace/courses/${slug}`);
    },
    enabled: !!slug,
  });

  const { data: accessData, refetch: refetchAccess } = useQuery<{
    hasAccess: boolean;
    isAuthor?: boolean;
    isSuperAdmin?: boolean;
    enrollment?: any;
  }>({
    queryKey: ['course-access', course?.id],
    queryFn: async () => {
      if (!course?.id) return { hasAccess: false };
      return apiClient.get(`/courses/${course.id}/access`);
    },
    enabled: !!user && !!course?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!course) return;
      return apiClient.post(`/courses/${course.id}/enroll`, {});
    },
    onSuccess: () => {
      setEnrollSuccess(true);
      setEnrollError(null);
      refetchAccess();
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-course-detail', slug] });
    },
    onError: (err: any) => {
      const msg = err?.message || 'Failed to complete course enrollment.';
      if (msg.toLowerCase().includes('already enrolled')) {
        setEnrollSuccess(true);
        setEnrollError(null);
        refetchAccess();
      } else {
        setEnrollError(msg);
      }
    },
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] === undefined ? false : !prev[sectionId],
    }));
  };

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!course) return;
      return apiClient.request(`/marketplace/courses/${course.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-course-detail', slug] });
      setIsReviewModalOpen(false);
      setReviewComment('');
      setReviewError(null);
    },
    onError: (err: any) => {
      setReviewError(err?.message || 'Failed to submit review. You must be enrolled in this course.');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12 space-y-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Course Not Found</AlertTitle>
          <AlertDescription>
            The course you are looking for does not exist or has not been approved and published to the public catalog yet.
          </AlertDescription>
        </Alert>
        <Link href="/courses">
          <Button variant="default" className="gap-2">
            <span>Browse Available Courses</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'TEXT':
        return <FileText className="h-4 w-4 text-brand-slate" />;
      case 'PDF_RESOURCE':
      case 'ATTACHMENT':
        return <Download className="h-4 w-4 text-brand-emerald" />;
      case 'EXTERNAL_RESOURCE':
        return <ExternalLink className="h-4 w-4 text-blue-500" />;
      default:
        return <PlayCircle className="h-4 w-4 text-brand-emerald" />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-page pb-24">
      {/* Hero Header */}
      <section className="bg-brand-navy text-white py-12 px-4 sm:px-6 relative">
        <div className="container mx-auto max-w-6xl space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-xs text-brand-slate">
            <Link href="/" className="hover:text-brand-emerald transition-colors">Home</Link>
            <span>/</span>
            <Link href="/courses" className="hover:text-brand-emerald transition-colors">Courses</Link>
            <span>/</span>
            <span className="text-white font-medium truncate max-w-xs">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-brand-emerald text-white text-xs">
                  {course.category?.name || 'General'}
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white text-xs">
                  {course.difficulty}
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white text-xs flex items-center gap-1">
                  <Globe2 className="h-3 w-3" />
                  <span>{course.language}</span>
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base text-brand-slate leading-relaxed">
                {course.description}
              </p>

              {/* Author and Stats Line */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-brand-slate pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-brand-emerald text-white flex items-center justify-center font-bold text-xs">
                    {course.author.fullName.charAt(0)}
                  </div>
                  <span className="text-white font-semibold">{course.author.fullName}</span>
                </div>
                {course.institution && (
                  <span className="text-brand-mint font-medium">
                    {course.institution.name}
                  </span>
                )}
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="h-4 w-4 fill-amber-400" />
                  <span>{course.stats.averageRating}</span>
                  <span className="text-brand-slate font-normal">
                    ({course.stats.reviewCount} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{course.stats.enrollmentCount} students enrolled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Learning Objectives, Syllabus, Bio, Reviews */}
          <div className="lg:col-span-2 space-y-10">
            {/* What You'll Learn */}
            {course.learningObjectives && course.learningObjectives.length > 0 && (
              <Card className="border border-brand-border bg-white shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brand-emerald" />
                    <span>What You'll Learn</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {course.learningObjectives.map((obj, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-brand-navy leading-relaxed">
                        <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <Card className="border border-brand-border bg-white shadow-sm">
                <CardContent className="p-6 space-y-3">
                  <h2 className="text-base font-bold text-brand-navy">Prerequisites & Requirements</h2>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-brand-slate">
                    {course.prerequisites.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Curriculum Outline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">Course Curriculum</h2>
                  <p className="text-xs text-brand-slate mt-0.5">
                    {course.stats.sectionsCount} sections • {course.stats.lessonsCount} lessons • {course.estimatedHours} hours total
                  </p>
                </div>
              </div>

              {course.sections.length === 0 ? (
                <div className="p-8 text-center bg-white border border-brand-border rounded-xl text-xs text-brand-slate">
                  Curriculum outline is being finalized by the instructor.
                </div>
              ) : (
                <div className="space-y-3">
                  {course.sections.map((sec, idx) => {
                    const isExpanded = expandedSections[sec.id] !== false; // Default open
                    return (
                      <div
                        key={sec.id}
                        className="border border-brand-border rounded-xl bg-white overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => toggleSection(sec.id)}
                          className="w-full px-5 py-4 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors"
                        >
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider">
                              Section {idx + 1}
                            </span>
                            <h3 className="font-bold text-sm text-brand-navy">{sec.title}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-brand-slate">
                            <span>{sec.lessons.length} lessons</span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-brand-slate" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-brand-slate" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-brand-border/60">
                            {sec.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  {getLessonIcon(lesson.type)}
                                  <span className="font-medium text-brand-navy">{lesson.title}</span>
                                  {lesson.isFreePreview && (
                                    <Badge className="bg-brand-mint text-brand-emerald hover:bg-brand-mint border-brand-emerald/30 text-[10px] py-0 px-2">
                                      Free Preview
                                    </Badge>
                                  )}
                                  {lesson.resources.length > 0 && (
                                    <span className="text-[10px] text-brand-slate bg-slate-100 px-1.5 py-0.5 rounded">
                                      {lesson.resources.length} resources
                                    </span>
                                  )}
                                </div>
                                <span className="text-brand-slate font-mono text-[11px]">
                                  {lesson.durationMinutes} min
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instructor Bio */}
            <Card className="border border-brand-border bg-white shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-brand-navy">Meet Your Instructor</h2>
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-brand-navy/10 flex items-center justify-center font-bold text-brand-navy text-xl shrink-0">
                    {course.author.fullName.charAt(0)}
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-brand-navy">{course.author.fullName}</h3>
                    <p className="text-xs text-brand-emerald font-semibold">
                      Author of {course.author.publishedCoursesCount} EduVerse Courses
                    </p>
                    <p className="text-xs text-brand-slate leading-relaxed">
                      {course.author.bio ||
                        'Experienced educator and subject matter expert dedicated to advancing student mastery in practical engineering and digital skills.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Reviews */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">Learner Reviews & Ratings</h2>
                  <p className="text-xs text-brand-slate">
                    Overall rating: <strong className="text-amber-500">{course.stats.averageRating} out of 5</strong> ({course.stats.reviewCount} verified reviews)
                  </p>
                </div>
                {user && (
                  <Button
                    onClick={() => setIsReviewModalOpen(true)}
                    variant="outline"
                    className="text-xs gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Leave a Review</span>
                  </Button>
                )}
              </div>

              {course.reviews.length === 0 ? (
                <div className="p-8 text-center bg-white border border-brand-border rounded-xl text-xs text-brand-slate">
                  No reviews submitted yet. Be the first enrolled student to share feedback!
                </div>
              ) : (
                <div className="space-y-3">
                  {course.reviews.map((rev) => (
                    <Card key={rev.id} className="border border-brand-border bg-white shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-brand-navy/10 flex items-center justify-center font-bold text-brand-navy text-[10px]">
                              {rev.user.fullName.charAt(0)}
                            </div>
                            <span className="font-semibold text-brand-navy">{rev.user.fullName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="text-xs text-brand-slate leading-relaxed pl-8">
                            {rev.comment}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Action Card */}
          <div className="space-y-6">
            <Card className="sticky top-20 border border-brand-border bg-white shadow-lg overflow-hidden">
              <div className="relative h-44 w-full bg-gradient-to-tr from-brand-navy to-slate-800">
                {course.thumbnailUrl ? (
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80">
                    <BookOpen className="h-12 w-12 text-brand-emerald" />
                  </div>
                )}
              </div>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                  <span className="text-2xl font-black text-brand-navy">Free & Open</span>
                  <p className="text-xs text-brand-slate">
                    Full curriculum access including assessments and digital certificates.
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-brand-border/60 text-xs">
                  <div className="flex items-center justify-between text-brand-slate">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-brand-emerald" />
                      <span>Estimated Duration</span>
                    </span>
                    <strong className="text-brand-navy">{course.estimatedHours} hours</strong>
                  </div>
                  <div className="flex items-center justify-between text-brand-slate">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-brand-emerald" />
                      <span>Total Lessons</span>
                    </span>
                    <strong className="text-brand-navy">{course.stats.lessonsCount} lessons</strong>
                  </div>
                  <div className="flex items-center justify-between text-brand-slate">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-brand-emerald" />
                      <span>Verified Certificate</span>
                    </span>
                    <strong className="text-brand-navy">Included</strong>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {!user ? (
                    <div className="space-y-2">
                      <Link href={`/login?redirect=/courses/${course.slug}`} className="block">
                        <Button variant="default" className="w-full gap-2 text-sm font-semibold h-11">
                          <span>Sign In to Enroll</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <p className="text-[11px] text-center text-brand-slate">
                        Free instant enrollment for registered learners.
                      </p>
                    </div>
                  ) : accessData?.hasAccess || enrollSuccess ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-brand-mint text-brand-navy rounded-lg text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0" />
                        <span>
                          {accessData?.isAuthor
                            ? 'You are the author of this course.'
                            : 'You are enrolled in this course!'}
                        </span>
                      </div>
                      <Link href={`/courses/${course.slug}/learn`} className="block">
                        <Button variant="emerald" className="w-full gap-2 text-sm font-semibold h-11">
                          <span>Open Learning Player</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href="/app/courses" className="block">
                        <Button variant="outline" className="w-full text-xs h-9 text-brand-slate">
                          <span>View in My Enrolled Courses</span>
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {enrollError && (
                        <Alert variant="destructive" className="py-2 px-3 text-xs">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{enrollError}</AlertDescription>
                        </Alert>
                      )}
                      <Button
                        variant="default"
                        onClick={() => enrollMutation.mutate()}
                        disabled={enrollMutation.isPending}
                        className="w-full gap-2 text-sm font-semibold h-11"
                      >
                        <span>
                          {enrollMutation.isPending ? 'Enrolling...' : 'Enroll in Free Course'}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <p className="text-[11px] text-center text-brand-slate">
                        Instant free access to all lessons and verified assessments.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Submission Dialog */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogHeader>
          <DialogTitle>Write a Course Review</DialogTitle>
          <DialogDescription>
            Share your feedback on {course.title} to help other students.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {reviewError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{reviewError}</AlertDescription>
            </Alert>
          )}

          <div>
            <label className="text-xs font-semibold text-brand-navy block mb-2">
              Your Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= reviewRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-navy block mb-1">
              Your Feedback (Optional)
            </label>
            <Textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="What did you like about this course? What could be improved?"
              rows={4}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsReviewModalOpen(false)}
            disabled={reviewMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={() => reviewMutation.mutate()}
            disabled={reviewMutation.isPending}
            className="text-xs gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
