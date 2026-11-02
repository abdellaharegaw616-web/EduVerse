'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck2,
  ArrowLeft,
  Save,
  CheckCircle2,
  Calendar,
  Award,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherAssignmentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params?.id as string;
  const initialLessonId = searchParams.get('lessonId');

  const queryClient = useQueryClient();

  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId || '');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [dueDate, setDueDate] = useState('');
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Load Course curriculum
  const { data: course } = useQuery({
    queryKey: ['teacher-course-detail', courseId],
    queryFn: () => apiClient.get<any>(`/courses/teacher/${courseId}`),
    enabled: Boolean(courseId),
  });

  const allLessons =
    course?.sections?.flatMap((s: any) =>
      s.lessons.map((l: any) => ({ ...l, sectionTitle: s.title })),
    ) || [];

  const activeLesson = allLessons.find((l: any) => l.id === selectedLessonId) || allLessons[0];
  const activeLessonId = activeLesson?.id;

  // Load Assignment for active lesson
  const { data: lessonData, isLoading: isLessonLoading } = useQuery({
    queryKey: ['teacher-lesson-assignment', activeLessonId],
    queryFn: async () => {
      if (!activeLessonId) return null;
      const res = await apiClient.get<any>(`/courses/teacher/lessons/${activeLessonId}`);
      if (res?.assignment) {
        setTitle(res.assignment.title || '');
        setInstructions(res.assignment.instructions || '');
        setMaxScore(res.assignment.maxScore || 100);
        setDueDate(res.assignment.dueDate ? res.assignment.dueDate.slice(0, 10) : '');
      } else {
        setTitle('');
        setInstructions('');
        setMaxScore(100);
        setDueDate('');
      }
      return res;
    },
    enabled: Boolean(activeLessonId),
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/courses/teacher/lessons/${activeLessonId}/assignment`, {
        title,
        instructions,
        maxScore: Number(maxScore),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      setSavedSuccess('Assignment configured successfully.');
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson-assignment', activeLessonId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      setTimeout(() => setSavedSuccess(null), 3000);
    },
  });

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
            Assignment & Coursework Management
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Create homework tasks, project prompts, and set grading criteria for students.
          </p>
        </div>

        <Link href="/teacher/grading">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <FileCheck2 className="h-4 w-4 text-amber-500" />
            <span>Review Submissions Queue</span>
          </Button>
        </Link>
      </div>

      {savedSuccess && (
        <Alert variant="default" className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription className="text-xs">{savedSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Target Lesson Selector */}
      <Card className="border border-brand-border bg-white shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <Label htmlFor="lessonSelect" className="text-xs font-semibold text-brand-navy whitespace-nowrap">
            Target Lesson:
          </Label>
          <select
            id="lessonSelect"
            value={activeLessonId || ''}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-navy shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald"
          >
            {allLessons.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.sectionTitle} → {l.title}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Assignment Form */}
      {isLessonLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <Card className="border border-brand-border bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-amber-600" />
              <span>
                {lessonData?.assignment ? 'Edit Assignment Prompt' : 'Create Assignment for Lesson'}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-brand-slate">
              Students will be able to submit text responses, GitHub repositories, or zip uploads.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-brand-navy">Assignment Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hands-on Project: Monorepo Setup & CI Automation"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-brand-emerald" />
                  <span>Maximum Score (Points)</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand-slate" />
                  <span>Submission Deadline (Optional)</span>
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-brand-navy">
                Instructions & Rubric (Markdown Supported)
              </Label>
              <Textarea
                rows={8}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specify requirements, architectural constraints, test criteria, and submission format..."
                className="text-xs font-mono leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="emerald"
                size="sm"
                onClick={() => upsertMutation.mutate()}
                disabled={!title.trim() || !instructions.trim() || upsertMutation.isPending}
                className="gap-2 text-xs font-bold"
              >
                <Save className="h-4 w-4" />
                <span>Save Assignment Prompt</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
