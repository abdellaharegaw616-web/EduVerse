'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Layers,
  Users,
  CheckCircle2,
  ExternalLink,
  Send,
  Archive,
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

const updateCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  thumbnailUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  language: z.string().min(2, 'Language is required'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']),
  learningObjectivesText: z.string().optional(),
  prerequisitesText: z.string().optional(),
  estimatedHours: z.coerce.number().min(1).max(500),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']),
});

type UpdateCourseFormValues = z.infer<typeof updateCourseSchema>;

export default function EditCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<'submit' | 'publish' | 'archive' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Course with ownership validation
  const {
    data: course,
    isLoading: isCourseLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['teacher-course-detail', courseId],
    queryFn: () => apiClient.get<any>(`/courses/teacher/${courseId}`),
    enabled: Boolean(courseId),
  });

  // 2. Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['course-categories'],
    queryFn: () => apiClient.get<any[]>('/courses/categories'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCourseFormValues>({
    resolver: zodResolver(updateCourseSchema) as any,
  });

  useEffect(() => {
    if (course) {
      reset({
        title: course.title || '',
        description: course.description || '',
        thumbnailUrl: course.thumbnailUrl || '',
        categoryId: course.categoryId || '',
        language: course.language || 'English',
        difficulty: course.difficulty || 'BEGINNER',
        learningObjectivesText: (course.learningObjectives || []).join('\n'),
        prerequisitesText: (course.prerequisites || []).join('\n'),
        estimatedHours: course.estimatedHours || 10,
        status: course.status || 'DRAFT',
      });
    }
  }, [course, reset]);

  // General Update Mutation
  const updateMutation = useMutation({
    mutationFn: (values: UpdateCourseFormValues) => {
      const learningObjectives = values.learningObjectivesText
        ? values.learningObjectivesText.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];

      const prerequisites = values.prerequisitesText
        ? values.prerequisitesText.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];

      return apiClient.patch(`/courses/teacher/${courseId}`, {
        title: values.title,
        description: values.description,
        thumbnailUrl: values.thumbnailUrl || undefined,
        categoryId: values.categoryId || undefined,
        language: values.language,
        difficulty: values.difficulty,
        learningObjectives,
        prerequisites,
        estimatedHours: values.estimatedHours,
        status: values.status,
      });
    },
    onSuccess: () => {
      setSuccessMessage('Course details updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  // Lifecycle Action Mutation
  const lifecycleMutation = useMutation({
    mutationFn: async (action: 'submit' | 'publish' | 'archive') => {
      const endpoint =
        action === 'submit'
          ? `/courses/teacher/${courseId}/submit-for-review`
          : action === 'publish'
          ? `/courses/teacher/${courseId}/publish`
          : `/courses/teacher/${courseId}/archive`;

      return apiClient.post(endpoint, {});
    },
    onSuccess: () => {
      setActionModal(null);
      setActionError(null);
      setSuccessMessage('Course lifecycle status updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to update course status. Verify that sections and lessons are populated.');
    },
  });

  const onSubmit = async (values: UpdateCourseFormValues) => {
    setSuccessMessage(null);
    await updateMutation.mutateAsync(values);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge className="bg-emerald-600 text-white">PUBLISHED</Badge>;
      case 'PENDING_REVIEW':
        return <Badge className="bg-amber-500 text-white">PENDING REVIEW</Badge>;
      case 'ARCHIVED':
        return <Badge className="bg-slate-500 text-white">ARCHIVED</Badge>;
      default:
        return <Badge variant="outline">DRAFT</Badge>;
    }
  };

  if (isCourseLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied or Not Found</AlertTitle>
          <AlertDescription className="text-xs">
            {(error as any)?.message ||
              'You do not have administrative permission to modify this course, or it does not exist.'}
          </AlertDescription>
        </Alert>
        <Link href="/teacher/courses">
          <Button variant="outline" className="text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Courses</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <Link
            href="/teacher/courses"
            className="text-xs font-semibold text-brand-slate hover:text-brand-navy flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to My Courses</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
              Course Settings & Lifecycle
            </h1>
            {course && getStatusBadge(course.status)}
          </div>
          <p className="text-xs text-brand-slate mt-0.5">
            Manage course metadata, difficulty, language, and moderation workflow.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-2">
          <Link href={`/teacher/courses/${courseId}/sections`}>
            <Button variant="outline" className="text-xs gap-1.5 h-9">
              <Layers className="h-3.5 w-3.5" />
              <span>Syllabus Modules</span>
            </Button>
          </Link>
          <Link href={`/teacher/courses/${courseId}/students`}>
            <Button variant="outline" className="text-xs gap-1.5 h-9">
              <Users className="h-3.5 w-3.5" />
              <span>Students</span>
            </Button>
          </Link>
        </div>
      </div>

      {successMessage && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-xs font-bold">Success</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Lifecycle Status Bar */}
      <Card className="border border-brand-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-brand-navy">Publication Workflow</h3>
            <p className="text-xs text-brand-slate">
              Current lifecycle status: <strong>{course.status}</strong>. Courses require moderation before being listed publicly.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {course.status === 'DRAFT' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setActionModal('submit')}
                className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit for Review</span>
              </Button>
            )}

            {course.status === 'PENDING_REVIEW' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setActionModal('publish')}
                className="text-xs gap-1.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Publish Course</span>
              </Button>
            )}

            {course.status === 'PUBLISHED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal('archive')}
                className="text-xs gap-1.5 text-slate-700"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive Course</span>
              </Button>
            )}

            {course.status === 'PUBLISHED' && (
              <Link href={`/courses/${course.slug}`} target="_blank">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Public View</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Course Edit Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border border-brand-border bg-white shadow-sm">
          <CardHeader className="border-b border-brand-border/60 pb-4">
            <CardTitle className="text-base text-brand-navy">Course Identity & Overview</CardTitle>
            <CardDescription className="text-xs">
              Basic discovery metadata visible to prospective learners.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold text-brand-navy">
                Course Title <span className="text-red-500">*</span>
              </Label>
              <Input id="title" {...register('title')} className="text-xs h-10" />
              {errors.title && (
                <p className="text-[11px] text-red-500 font-medium">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-brand-navy">
                Course Description <span className="text-red-500">*</span>
              </Label>
              <Textarea id="description" rows={4} {...register('description')} className="text-xs" />
              {errors.description && (
                <p className="text-[11px] text-red-500 font-medium">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thumbnailUrl" className="text-xs font-semibold text-brand-navy">
                Cover Thumbnail Image URL
              </Label>
              <Input
                id="thumbnailUrl"
                placeholder="https://cdn.eduverse.et/courses/thumbnails/sample.jpg"
                {...register('thumbnailUrl')}
                className="text-xs h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="categoryId" className="text-xs font-semibold text-brand-navy">
                  Academic Category
                </Label>
                <select
                  id="categoryId"
                  {...register('categoryId')}
                  className="w-full text-xs rounded-md border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald h-10"
                >
                  <option value="">Select Category...</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="language" className="text-xs font-semibold text-brand-navy">
                  Instruction Language
                </Label>
                <select
                  id="language"
                  {...register('language')}
                  className="w-full text-xs rounded-md border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald h-10"
                >
                  <option value="English">English</option>
                  <option value="Amharic">Amharic</option>
                  <option value="Afaan Oromoo">Afaan Oromoo</option>
                  <option value="Tigrinya">Tigrinya</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="difficulty" className="text-xs font-semibold text-brand-navy">
                  Difficulty Level
                </Label>
                <select
                  id="difficulty"
                  {...register('difficulty')}
                  className="w-full text-xs rounded-md border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald h-10"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimatedHours" className="text-xs font-semibold text-brand-navy">
                  Estimated Duration (Hours)
                </Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min={1}
                  max={500}
                  {...register('estimatedHours')}
                  className="text-xs h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals & Prerequisites */}
        <Card className="border border-brand-border bg-white shadow-sm">
          <CardHeader className="border-b border-brand-border/60 pb-4">
            <CardTitle className="text-base text-brand-navy">Curriculum Goals & Prerequisites</CardTitle>
            <CardDescription className="text-xs">
              Enter one goal or prerequisite per line.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="learningObjectivesText" className="text-xs font-semibold text-brand-navy">
                What Students Will Learn (One objective per line)
              </Label>
              <Textarea
                id="learningObjectivesText"
                rows={4}
                {...register('learningObjectivesText')}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prerequisitesText" className="text-xs font-semibold text-brand-navy">
                Prerequisites & Requirements (One per line)
              </Label>
              <Textarea
                id="prerequisitesText"
                rows={3}
                {...register('prerequisitesText')}
                className="text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/teacher/courses">
            <Button variant="outline" type="button" className="text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="text-xs gap-2 min-w-[130px]"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Confirmation Dialogs for Lifecycle Transitions */}
      <Dialog open={actionModal !== null} onOpenChange={() => setActionModal(null)}>
        <DialogHeader>
          <DialogTitle>
            {actionModal === 'submit' && 'Submit Course for Moderation Review'}
            {actionModal === 'publish' && 'Publish Course to Marketplace'}
            {actionModal === 'archive' && 'Archive Course'}
          </DialogTitle>
          <DialogDescription>
            {actionModal === 'submit' &&
              'Your course curriculum will be locked and reviewed by the academic moderation board before appearing in the marketplace.'}
            {actionModal === 'publish' &&
              'This course will immediately become accessible to students and learners in the public EduVerse marketplace.'}
            {actionModal === 'archive' &&
              'This course will be hidden from new student enrollments in the catalog. Existing enrolled students will maintain access.'}
          </DialogDescription>
        </DialogHeader>

        {actionError && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{actionError}</AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setActionModal(null)}
            disabled={lifecycleMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={() => actionModal && lifecycleMutation.mutate(actionModal)}
            disabled={lifecycleMutation.isPending}
            className="text-xs gap-1.5"
          >
            {lifecycleMutation.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
