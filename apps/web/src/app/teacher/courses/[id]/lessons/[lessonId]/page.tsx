'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  PlayCircle,
  HelpCircle,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const lessonSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  videoUrl: z.string().url('Must be a valid video URL').optional().or(z.literal('')),
  durationMinutes: z.coerce.number().min(1).max(300),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

export default function LessonEditorPage() {
  const params = useParams();
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;
  const queryClient = useQueryClient();
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const {
    data: lesson,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['teacher-lesson', lessonId],
    queryFn: () => apiClient.get<any>(`/courses/teacher/lessons/${lessonId}`),
    enabled: Boolean(lessonId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema) as any,
  });

  useEffect(() => {
    if (lesson) {
      reset({
        title: lesson.title || '',
        content: lesson.content || '',
        videoUrl: lesson.videoUrl || '',
        durationMinutes: lesson.durationMinutes || 15,
      });
    }
  }, [lesson, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: LessonFormValues) =>
      apiClient.patch(`/courses/teacher/lessons/${lessonId}`, {
        title: values.title,
        content: values.content,
        videoUrl: values.videoUrl || undefined,
        durationMinutes: values.durationMinutes,
      }),
    onSuccess: () => {
      setSavedSuccess('Lesson saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      setTimeout(() => setSavedSuccess(null), 3000);
    },
  });

  const onSubmit = async (values: LessonFormValues) => {
    setSavedSuccess(null);
    await updateMutation.mutateAsync(values);
  };

  if (isError) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Access Denied or Not Found</AlertTitle>
          <AlertDescription className="text-xs">
            {(error as any)?.message || 'Lesson not found or you lack author permissions.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <Link
            href={`/teacher/courses/${courseId}/sections`}
            className="text-xs font-semibold text-brand-slate hover:text-brand-navy flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Curriculum Modules</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Lesson Editor
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Craft instructional notes, embed low-bandwidth video lectures, and attach assessments.
          </p>
        </div>

        {/* Quick Nav to Quiz & Assignment for this lesson */}
        <div className="flex items-center gap-2">
          <Link href={`/teacher/courses/${courseId}/quizzes?lessonId=${lessonId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <HelpCircle className="h-3.5 w-3.5 text-purple-600" />
              <span>{lesson?.quiz ? 'Edit Quiz' : 'Add Quiz'}</span>
            </Button>
          </Link>
          <Link href={`/teacher/courses/${courseId}/assignments?lessonId=${lessonId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileCheck2 className="h-3.5 w-3.5 text-amber-600" />
              <span>{lesson?.assignment ? 'Edit Assignment' : 'Add Assignment'}</span>
            </Button>
          </Link>
        </div>
      </div>

      {savedSuccess && (
        <Alert variant="default" className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
          <AlertTitle>Lesson Saved</AlertTitle>
          <AlertDescription className="text-xs">{savedSuccess}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : lesson ? (
        <Card className="border border-brand-border bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-emerald" />
              <span>Lesson Details</span>
            </CardTitle>
            <CardDescription className="text-xs text-brand-slate">
              Section: {lesson.section?.title || 'Current Section'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold text-brand-navy">
                  Lesson Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  error={errors.title?.message}
                  {...register('title')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="videoUrl" className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                    <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
                    <span>Video Lecture URL (Optional)</span>
                  </Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    placeholder="https://cdn.eduverse.et/lectures/video.mp4"
                    error={errors.videoUrl?.message}
                    {...register('videoUrl')}
                  />
                  <span className="text-[10px] text-brand-slate">
                    Direct MP4 or adaptive streaming URL for low-bandwidth playback.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="durationMinutes" className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand-emerald" />
                    <span>Estimated Duration (Minutes)</span>
                  </Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min="1"
                    max="300"
                    error={errors.durationMinutes?.message}
                    {...register('durationMinutes')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="content" className="text-xs font-semibold text-brand-navy">
                  Lesson Notes & Instructions (Markdown Supported) <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  rows={12}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="# Lecture Notes\n\nExplain key concepts, algorithms, code snippets, or reference links here..."
                  error={errors.content?.message}
                  {...register('content')}
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex items-center justify-between">
                <Link href={`/teacher/courses/${courseId}/sections`}>
                  <Button type="button" variant="outline" size="sm" className="text-xs">
                    Cancel
                  </Button>
                </Link>

                <Button
                  type="submit"
                  variant="emerald"
                  size="sm"
                  disabled={isSubmitting || updateMutation.isPending}
                  className="gap-2 text-xs font-bold"
                >
                  {isSubmitting || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Lesson</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

