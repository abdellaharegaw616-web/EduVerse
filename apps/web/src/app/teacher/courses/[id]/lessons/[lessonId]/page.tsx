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
  Download,
  PlusCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const lessonSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  videoUrl: z.string().url('Must be a valid video URL').optional().or(z.literal('')),
  durationMinutes: z.coerce.number().min(1).max(300),
  type: z.enum(['VIDEO', 'TEXT', 'PDF_RESOURCE', 'EXTERNAL_RESOURCE', 'ATTACHMENT']),
  isFreePreview: z.boolean().default(false),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonResource {
  id: string;
  lessonId: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export default function LessonEditorPage() {
  const params = useParams();
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;
  const queryClient = useQueryClient();

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceFileUrl, setResourceFileUrl] = useState('');
  const [resourceFileType, setResourceFileType] = useState('PDF');
  const [resourceError, setResourceError] = useState<string | null>(null);

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
        type: lesson.type || 'VIDEO',
        isFreePreview: !!lesson.isFreePreview,
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
        type: values.type,
        isFreePreview: values.isFreePreview,
      }),
    onSuccess: () => {
      setSavedSuccess('Lesson details and settings saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      setTimeout(() => setSavedSuccess(null), 3000);
    },
  });

  // Add Resource Mutation
  const addResourceMutation = useMutation({
    mutationFn: async () => {
      if (!resourceTitle.trim() || !resourceFileUrl.trim()) {
        throw new Error('Title and File URL are required');
      }
      return apiClient.post(`/courses/teacher/lessons/${lessonId}/resources`, {
        title: resourceTitle.trim(),
        fileUrl: resourceFileUrl.trim(),
        fileType: resourceFileType,
        fileSize: 1024,
      });
    },
    onSuccess: () => {
      setIsResourceModalOpen(false);
      setResourceTitle('');
      setResourceFileUrl('');
      setResourceError(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson', lessonId] });
    },
    onError: (err: any) => {
      setResourceError(err?.message || 'Failed to attach resource. Check URL format.');
    },
  });

  // Delete Resource Mutation
  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.delete(`/courses/teacher/resources/${resourceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson', lessonId] });
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

  const resources: LessonResource[] = lesson?.resources || [];

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
            Craft instructional notes, attach downloadable resources, and configure video or reading settings.
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
        <div className="space-y-6">
          <Card className="border border-brand-border bg-white shadow-xs">
            <CardHeader className="border-b border-brand-border/60 pb-4">
              <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-emerald" />
                <span>Lesson Details & Media</span>
              </CardTitle>
              <CardDescription className="text-xs text-brand-slate">
                Module: {lesson.section?.title || 'Current Section'}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-semibold text-brand-navy">
                    Lesson Title <span className="text-red-500">*</span>
                  </Label>
                  <Input id="title" {...register('title')} className="text-xs h-10" />
                  {errors.title && (
                    <p className="text-[11px] text-red-500">{errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Lesson Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="type" className="text-xs font-semibold text-brand-navy">
                      Lesson Format / Type
                    </Label>
                    <select
                      id="type"
                      {...register('type')}
                      className="w-full text-xs rounded-md border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald h-10"
                    >
                      <option value="VIDEO">Video Lecture</option>
                      <option value="TEXT">Text & Reading Notes</option>
                      <option value="PDF_RESOURCE">PDF Slide Resource</option>
                      <option value="EXTERNAL_RESOURCE">External Link / Lab</option>
                      <option value="ATTACHMENT">Downloadable Attachment</option>
                    </select>
                  </div>

                  {/* Estimated Duration */}
                  <div className="space-y-1.5">
                    <Label htmlFor="durationMinutes" className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-brand-emerald" />
                      <span>Duration (Minutes)</span>
                    </Label>
                    <Input
                      id="durationMinutes"
                      type="number"
                      min="1"
                      max="300"
                      {...register('durationMinutes')}
                      className="text-xs h-10"
                    />
                  </div>

                  {/* Free Preview Toggle */}
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-brand-border bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                      <input
                        type="checkbox"
                        {...register('isFreePreview')}
                        className="h-4 w-4 rounded border-brand-border text-brand-emerald focus:ring-brand-emerald"
                      />
                      <span className="text-xs font-semibold text-brand-navy">
                        Free Public Preview
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="videoUrl" className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                    <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
                    <span>Video Lecture URL (Optional)</span>
                  </Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    placeholder="https://cdn.eduverse.et/lectures/video.mp4"
                    {...register('videoUrl')}
                    className="text-xs h-10"
                  />
                  <span className="text-[10px] text-brand-slate">
                    Direct MP4 or adaptive streaming URL for low-bandwidth playback.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="content" className="text-xs font-semibold text-brand-navy">
                    Lesson Notes & Instructions (Markdown Supported) <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    rows={10}
                    className="font-mono text-xs leading-relaxed"
                    placeholder="# Lecture Notes\n\nExplain key concepts, algorithms, code snippets, or reference links here..."
                    {...register('content')}
                  />
                  {errors.content && (
                    <p className="text-[11px] text-red-500">{errors.content.message}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-brand-border flex items-center justify-between">
                  <Link href={`/teacher/courses/${courseId}/sections`}>
                    <Button type="button" variant="outline" size="sm" className="text-xs">
                      Cancel
                    </Button>
                  </Link>

                  <Button
                    type="submit"
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

          {/* Lesson Resources Manager Card */}
          <Card className="border border-brand-border bg-white shadow-xs">
            <CardHeader className="border-b border-brand-border/60 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                  <Download className="h-4 w-4 text-brand-emerald" />
                  <span>Lesson Resources & Supplementary Files</span>
                </CardTitle>
                <CardDescription className="text-xs text-brand-slate">
                  Attach PDFs, lecture slide decks, sample datasets, or reference lab links.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResourceModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Attach Resource</span>
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              {resources.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-brand-border rounded-xl text-xs text-brand-slate">
                  No resources attached to this lesson yet. Click "Attach Resource" to add supplemental files.
                </div>
              ) : (
                <div className="divide-y divide-brand-border/60 border border-brand-border rounded-xl overflow-hidden">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="h-4 w-4 text-brand-emerald" />
                        <div>
                          <h4 className="text-xs font-bold text-brand-navy">{res.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-brand-slate">
                            <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                              {res.fileType}
                            </Badge>
                            <a
                              href={res.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-emerald hover:underline flex items-center gap-0.5 truncate max-w-xs"
                            >
                              <span>{res.fileUrl}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteResourceMutation.mutate(res.id)}
                        disabled={deleteResourceMutation.isPending}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Attach Resource Dialog */}
      <Dialog open={isResourceModalOpen} onOpenChange={setIsResourceModalOpen}>
        <DialogHeader>
          <DialogTitle>Attach Resource to Lesson</DialogTitle>
          <DialogDescription>
            Provide a downloadable file URL (PDF, dataset, code package) or external lab link.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {resourceError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{resourceError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-brand-navy">Resource Title</Label>
            <Input
              value={resourceTitle}
              onChange={(e) => setResourceTitle(e.target.value)}
              placeholder="e.g., Chapter 1 Lecture Slides (PDF)"
              className="text-xs h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-brand-navy">Resource URL</Label>
            <Input
              type="url"
              value={resourceFileUrl}
              onChange={(e) => setResourceFileUrl(e.target.value)}
              placeholder="https://cdn.eduverse.et/resources/slides.pdf"
              className="text-xs h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-brand-navy">Resource Type</Label>
            <select
              value={resourceFileType}
              onChange={(e) => setResourceFileType(e.target.value)}
              className="w-full text-xs rounded-md border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald h-10"
            >
              <option value="PDF">PDF Document</option>
              <option value="EXTERNAL_LINK">External Documentation / Lab</option>
              <option value="ATTACHMENT">Source Code / Archive Attachment</option>
              <option value="DOCUMENT">Reference Worksheet</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsResourceModalOpen(false)}
            disabled={addResourceMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={() => addResourceMutation.mutate()}
            disabled={addResourceMutation.isPending}
            className="text-xs gap-1.5"
          >
            {addResourceMutation.isPending ? 'Attaching...' : 'Add Resource'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
