'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  BookOpenCheck,
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
  thumbnailUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  language: z.string().min(2, 'Language is required'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']),
  learningObjectivesText: z.string().optional(),
  prerequisitesText: z.string().optional(),
  estimatedHours: z.coerce.number().min(1).max(500),
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

  const [aiTopic, setAiTopic] = useState('');
  const [aiOutlineSections, setAiOutlineSections] = useState<
    Array<{ title: string; lessons: string[] }>
  >([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      thumbnailUrl: '',
      categoryId: '',
      language: 'English',
      difficulty: 'BEGINNER',
      learningObjectivesText: '',
      prerequisitesText: '',
      estimatedHours: 10,
    },
  });

  const outlineMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{
        title: string;
        description: string;
        difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
        estimatedHours: number;
        learningObjectives: string[];
        prerequisites: string[];
        sections: Array<{ title: string; lessons: string[] }>;
      }>('/ai/teacher/generate-outline', {
        topic: aiTopic.trim(),
        difficulty: watch('difficulty'),
        sectionCount: 4,
      }),
    onSuccess: (res) => {
      setValue('title', res.title, { shouldValidate: true });
      setValue('description', res.description, { shouldValidate: true });
      setValue('estimatedHours', res.estimatedHours, { shouldValidate: true });
      setValue('learningObjectivesText', res.learningObjectives.join('\n'));
      setValue('prerequisitesText', res.prerequisites.join('\n'));
      setAiOutlineSections(res.sections || []);
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateCourseFormValues) => {
      const learningObjectives = values.learningObjectivesText
        ? values.learningObjectivesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const prerequisites = values.prerequisitesText
        ? values.prerequisitesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      return apiClient.post<any>('/courses/teacher', {
        title: values.title,
        description: values.description,
        thumbnailUrl: values.thumbnailUrl || undefined,
        categoryId: values.categoryId || undefined,
        language: values.language,
        difficulty: values.difficulty,
        learningObjectives,
        prerequisites,
        estimatedHours: values.estimatedHours,
      });
    },
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
            Initialize your curriculum blueprint with rich metadata. You can attach sections, video lectures, and quizzes next.
          </p>
        </div>
      </div>

      {createMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Create Course</AlertTitle>
          <AlertDescription className="text-xs">
            {(createMutation.error as any)?.message ||
              'A problem occurred while initializing your course. Please verify input fields and try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Optional AI Course Outline Assistant */}
      <Card className="border border-brand-border dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4 text-brand-emerald" />
            <span>AI Curriculum Outline Assistant (Optional)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Enter a subject topic to pre-populate course title, summary description, learning objectives, and a suggested module structure.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g., Full-Stack Cloud Architecture with NestJS & PostgreSQL"
              className="text-xs h-9 bg-white dark:bg-slate-950 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiTopic.trim().length < 3 || outlineMutation.isPending}
              onClick={() => outlineMutation.mutate()}
              className="h-9 text-xs gap-1.5 shrink-0"
            >
              {outlineMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookOpenCheck className="h-3.5 w-3.5 text-brand-emerald" />
              )}
              <span>Draft Blueprint</span>
            </Button>
          </div>

          {aiOutlineSections.length > 0 && (
            <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-brand-border dark:border-slate-800 space-y-1.5">
              <p className="text-[11px] font-bold text-brand-navy dark:text-slate-200">
                Suggested Module Structure (add these sections on the next step):
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-brand-slate dark:text-slate-400">
                {aiOutlineSections.map((sec, idx) => (
                  <li key={idx}>
                    <strong className="text-brand-navy dark:text-slate-200">
                      {idx + 1}. {sec.title}
                    </strong>{' '}
                    ({sec.lessons.length} lessons)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Blueprint Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border border-brand-border bg-white shadow-sm">
          <CardHeader className="border-b border-brand-border/60 pb-4">
            <CardTitle className="text-base text-brand-navy">Course Identity & Overview</CardTitle>
            <CardDescription className="text-xs">
              Basic discovery metadata visible to prospective learners in the marketplace catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold text-brand-navy">
                Course Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Advanced Distributed Systems with TypeScript"
                {...register('title')}
                className="text-xs h-10"
              />
              {errors.title && (
                <p className="text-[11px] text-red-500 font-medium">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-brand-navy">
                Course Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Describe what students will master, curriculum structure, and real-world applicability..."
                {...register('description')}
                className="text-xs"
              />
              {errors.description && (
                <p className="text-[11px] text-red-500 font-medium">{errors.description.message}</p>
              )}
            </div>

            {/* Thumbnail URL */}
            <div className="space-y-1.5">
              <Label htmlFor="thumbnailUrl" className="text-xs font-semibold text-brand-navy">
                Cover Thumbnail Image URL (Optional)
              </Label>
              <Input
                id="thumbnailUrl"
                placeholder="https://cdn.eduverse.et/courses/thumbnails/sample.jpg"
                {...register('thumbnailUrl')}
                className="text-xs h-10"
              />
              {errors.thumbnailUrl && (
                <p className="text-[11px] text-red-500 font-medium">{errors.thumbnailUrl.message}</p>
              )}
            </div>

            {/* Category & Language Grid */}
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

            {/* Difficulty & Estimated Duration Grid */}
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
                {errors.estimatedHours && (
                  <p className="text-[11px] text-red-500 font-medium">{errors.estimatedHours.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Objectives & Prerequisites */}
        <Card className="border border-brand-border bg-white shadow-sm">
          <CardHeader className="border-b border-brand-border/60 pb-4">
            <CardTitle className="text-base text-brand-navy">Curriculum Goals & Prerequisites</CardTitle>
            <CardDescription className="text-xs">
              Outline specific competencies learners will acquire and background expectations. Enter one item per line.
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
                placeholder="Architect modular distributed microservices&#10;Implement resilient caching with Redis&#10;Deploy production containers with Kubernetes"
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
                placeholder="Solid grasp of TypeScript & Node.js&#10;Basic knowledge of relational databases (PostgreSQL)"
                {...register('prerequisitesText')}
                className="text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/teacher/courses">
            <Button variant="outline" type="button" className="text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="text-xs gap-2 min-w-[140px]"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Initializing...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save & Build Syllabus</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
