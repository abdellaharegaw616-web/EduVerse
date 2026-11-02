'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Layers,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const updateCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']),
  categoryId: z.string().optional().or(z.literal('')),
});

type UpdateCourseFormValues = z.infer<typeof updateCourseSchema>;

export default function EditCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    resolver: zodResolver(updateCourseSchema),
  });

  useEffect(() => {
    if (course) {
      reset({
        title: course.title || '',
        description: course.description || '',
        status: course.status || 'DRAFT',
        categoryId: course.categoryId || '',
      });
    }
  }, [course, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: UpdateCourseFormValues) =>
      apiClient.patch(`/courses/teacher/${courseId}`, {
        title: values.title,
        description: values.description,
        status: values.status,
        categoryId: values.categoryId || undefined,
      }),
    onSuccess: () => {
      setSuccessMessage('Course details updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const onSubmit = async (values: UpdateCourseFormValues) => {
    setSuccessMessage(null);
    await updateMutation.mutateAsync(values);
  };

  if (isError) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Access Denied or Not Found</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed mt-1">
            {(error as any)?.message ||
              'You do not have permission to manage this course, or it has been removed.'}
          </AlertDescription>
        </Alert>
        <div className="pt-4 text-center">
          <Link href="/teacher/courses">
            <Button variant="outline" size="sm">
              Back to My Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <Link
            href="/teacher/courses"
            className="text-xs font-semibold text-brand-slate hover:text-brand-navy flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to My Courses</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Edit Course Settings
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Modify course metadata, publication status, and access curriculum modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/teacher/courses/${courseId}/sections`}>
            <Button variant="default" size="sm" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" />
              <span>Curriculum Sections</span>
            </Button>
          </Link>
          <Link href={`/teacher/courses/${courseId}/students`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              <span>Students</span>
            </Button>
          </Link>
        </div>
      </div>

      {successMessage && (
        <Alert variant="default" className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {isCourseLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : course ? (
        <Card className="border border-brand-border bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-emerald" />
              <span>Course Metadata & Publication Status</span>
            </CardTitle>
            <CardDescription className="text-xs text-brand-slate">
              Slug: <code className="font-mono text-brand-navy">/courses/{course.slug}</code>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold text-brand-navy">
                  Course Title
                </Label>
                <Input
                  id="title"
                  error={errors.title?.message}
                  {...register('title')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold text-brand-navy">
                    Lifecycle Status
                  </Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-xs text-brand-navy shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald"
                    {...register('status')}
                  >
                    <option value="DRAFT">DRAFT (Unpublished, author only)</option>
                    <option value="PENDING_REVIEW">PENDING REVIEW (Faculty review)</option>
                    <option value="PUBLISHED">PUBLISHED (Live for student enrollments)</option>
                    <option value="ARCHIVED">ARCHIVED (Read-only)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="categoryId" className="text-xs font-semibold text-brand-navy">
                    Category / Discipline
                  </Label>
                  <select
                    id="categoryId"
                    className="flex h-10 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-xs text-brand-navy shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald"
                    {...register('categoryId')}
                  >
                    <option value="">Uncategorized</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold text-brand-navy">
                  Course Overview & Description
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  error={errors.description?.message}
                  {...register('description')}
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex items-center justify-between">
                <Link href={`/courses/${course.slug}`} target="_blank">
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs text-brand-slate">
                    <span>Preview Public Page</span>
                    <ExternalLink className="h-3 w-3" />
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
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
