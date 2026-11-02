'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  BookOpen,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, 'Course title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .min(10, 'Please provide an informative description of at least 10 characters'),
  categoryId: z.string().optional().or(z.literal('')),
});

type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CreateCoursePage() {
  const router = useRouter();

  // Load categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['course-categories'],
    queryFn: () => apiClient.get<Category[]>('/courses/categories'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateCourseFormValues) =>
      apiClient.post<any>('/courses/teacher', {
        title: values.title,
        description: values.description,
        categoryId: values.categoryId || undefined,
      }),
    onSuccess: (newCourse) => {
      // Redirect to section builder to immediately add syllabus modules
      router.push(`/teacher/courses/${newCourse.id}/sections`);
    },
  });

  const onSubmit = async (values: CreateCourseFormValues) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-6 pb-16 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-border pb-6">
        <div>
          <Link
            href="/teacher/courses"
            className="text-xs font-semibold text-brand-slate hover:text-brand-navy flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to My Courses</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Draft a New Course
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Initialize your curriculum blueprint. You can add modular sections, video lectures, and quizzes next.
          </p>
        </div>
      </div>

      {createMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Creation Failed</AlertTitle>
          <AlertDescription>
            {(createMutation.error as any)?.message || 'Failed to create course blueprint. Please check inputs.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Form Card */}
      <Card className="border border-brand-border bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-emerald" />
            <span>Curriculum Metadata</span>
          </CardTitle>
          <CardDescription className="text-xs text-brand-slate">
            New courses are saved in <strong>DRAFT</strong> status until you explicitly submit or publish them.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold text-brand-navy">
                Course Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Modern Full-Stack Distributed Systems with TypeScript"
                error={errors.title?.message}
                {...register('title')}
              />
              <span className="text-[10px] text-brand-slate">
                Give your course a descriptive, academic title. URL slug is generated automatically.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoryId" className="text-xs font-semibold text-brand-navy">
                Discipline / Category
              </Label>
              <select
                id="categoryId"
                className="flex h-10 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-xs text-brand-navy shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald"
                {...register('categoryId')}
              >
                <option value="">Select a Discipline (Optional)</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-brand-navy">
                Course Overview & Objectives <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                rows={5}
                placeholder="Summarize course goals, prerequisites, target learners, and expected outcomes..."
                error={errors.description?.message}
                {...register('description')}
              />
            </div>

            <div className="pt-3 border-t border-brand-border flex items-center justify-between">
              <Link href="/teacher/courses">
                <Button type="button" variant="outline" size="sm" className="text-xs">
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                variant="emerald"
                size="sm"
                disabled={isSubmitting || createMutation.isPending}
                className="gap-2 text-xs font-bold"
              >
                {isSubmitting || createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save Blueprint & Continue</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
