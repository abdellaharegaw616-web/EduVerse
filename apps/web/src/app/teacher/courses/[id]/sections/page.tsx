'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  PlusCircle,
  ArrowLeft,
  PlayCircle,
  Trash2,
  Edit,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

interface Lesson {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  videoUrl?: string | null;
  sortOrder: number;
  quiz?: { id: string; title: string } | null;
  assignment?: { id: string; title: string } | null;
}

interface Section {
  id: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  status: string;
  sections: Section[];
}

export default function CourseSectionsPage() {
  const params = useParams();
  const courseId = params?.id as string;
  const queryClient = useQueryClient();

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [activeSectionForLesson, setActiveSectionForLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  // Delete modals
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  const {
    data: course,
    isLoading,
    isError,
    error,
  } = useQuery<CourseDetail>({
    queryKey: ['teacher-course-detail', courseId],
    queryFn: () => apiClient.get<CourseDetail>(`/courses/teacher/${courseId}`),
    enabled: Boolean(courseId),
  });

  // Section mutations
  const createSectionMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient.post(`/courses/teacher/${courseId}/sections`, {
        title,
        sortOrder: (course?.sections.length || 0) + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      setNewSectionTitle('');
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) =>
      apiClient.delete(`/courses/teacher/sections/${sectionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      setSectionToDelete(null);
    },
  });

  // Lesson mutations
  const createLessonMutation = useMutation({
    mutationFn: ({ sectionId, title }: { sectionId: string; title: string }) =>
      apiClient.post(`/courses/teacher/sections/${sectionId}/lessons`, {
        title,
        content: '# New Lesson Notes\n\nAdd educational notes here.',
        durationMinutes: 15,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      setActiveSectionForLesson(null);
      setNewLessonTitle('');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      apiClient.delete(`/courses/teacher/lessons/${lessonId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
      setLessonToDelete(null);
    },
  });

  if (isError) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription className="text-xs">
            {(error as any)?.message || 'Course not found or unauthorized.'}
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
            href={`/teacher/courses/${courseId}/edit`}
            className="text-xs font-semibold text-brand-slate hover:text-brand-navy flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Course Settings</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Curriculum Structure & Modules
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            {course?.title || 'Course Modules'} — Organize sequential learning units, lectures, and evaluations.
          </p>
        </div>

        <Link href={`/teacher/courses/${courseId}/edit`}>
          <Button variant="outline" size="sm">
            Course Settings
          </Button>
        </Link>
      </div>

      {/* Add New Section Inline Form */}
      <Card className="border border-brand-emerald/30 bg-emerald-50/20 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <Input
            placeholder="e.g. Module 1: Architectural Foundations"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            className="text-xs bg-white"
          />
          <Button
            variant="emerald"
            size="sm"
            onClick={() => newSectionTitle.trim() && createSectionMutation.mutate(newSectionTitle)}
            disabled={!newSectionTitle.trim() || createSectionMutation.isPending}
            className="whitespace-nowrap text-xs gap-1.5 w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Module Section</span>
          </Button>
        </CardContent>
      </Card>

      {/* Sections Tree */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : course?.sections && course.sections.length > 0 ? (
        <div className="space-y-4">
          {course.sections.map((section, sIdx) => (
            <Card key={section.id} className="border border-brand-border bg-white shadow-xs overflow-hidden">
              <CardHeader className="p-4 bg-slate-50/60 border-b border-brand-border/60 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-brand-navy text-white text-xs font-bold flex items-center justify-center">
                    {sIdx + 1}
                  </span>
                  <CardTitle className="text-sm font-bold text-brand-navy">
                    {section.title}
                  </CardTitle>
                  <span className="text-[11px] text-brand-slate">
                    ({section.lessons.length} lessons)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveSectionForLesson(section.id)}
                    className="h-7 text-xs gap-1 text-brand-emerald hover:text-brand-emerald"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Add Lesson</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSectionToDelete(section)}
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5"
                    title="Delete Module"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-2">
                {/* Add Lesson Inline input for this section */}
                {activeSectionForLesson === section.id && (
                  <div className="p-3 bg-brand-mint/30 rounded-lg border border-brand-emerald/30 flex items-center gap-2 mb-3">
                    <Input
                      placeholder="e.g. Lesson 1: Monorepo Architecture"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      className="text-xs bg-white h-8"
                      autoFocus
                    />
                    <Button
                      variant="emerald"
                      size="sm"
                      onClick={() =>
                        newLessonTitle.trim() &&
                        createLessonMutation.mutate({ sectionId: section.id, title: newLessonTitle })
                      }
                      disabled={!newLessonTitle.trim() || createLessonMutation.isPending}
                      className="h-8 text-xs whitespace-nowrap"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSectionForLesson(null)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {section.lessons.length > 0 ? (
                  <div className="divide-y divide-brand-border/60">
                    {section.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-brand-slate font-mono">
                            {sIdx + 1}.{lIdx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-brand-navy block">
                              {lesson.title}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-brand-slate">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lesson.durationMinutes} min
                              </span>
                              {lesson.videoUrl && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                  <PlayCircle className="h-3 w-3" /> Video Included
                                </span>
                              )}
                              {lesson.quiz && (
                                <Badge variant="outline" className="text-[9px] h-4 py-0 bg-purple-50 text-purple-700 border-purple-200">
                                  Quiz: {lesson.quiz.title}
                                </Badge>
                              )}
                              {lesson.assignment && (
                                <Badge variant="outline" className="text-[9px] h-4 py-0 bg-amber-50 text-amber-700 border-amber-200">
                                  Assignment: {lesson.assignment.title}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <Link href={`/teacher/courses/${courseId}/lessons/${lesson.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                              <Edit className="h-3 w-3" />
                              <span>Edit Lesson</span>
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLessonToDelete(lesson)}
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5"
                            title="Delete Lesson"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-brand-slate py-3 text-center">
                    No lessons in this module yet. Click "Add Lesson" above.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed border-2 border-brand-border bg-slate-50">
          <Layers className="h-8 w-8 text-brand-slate mx-auto mb-2 opacity-60" />
          <h3 className="font-bold text-sm text-brand-navy">Curriculum Empty</h3>
          <p className="text-xs text-brand-slate max-w-sm mx-auto mt-1 mb-4">
            Add your first module section (e.g. "Week 1: Introduction") above to start building the course syllabus.
          </p>
        </Card>
      )}

      {/* Delete Section Dialog */}
      <Dialog
        open={Boolean(sectionToDelete)}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Module Section</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{sectionToDelete?.title}</strong>? All lessons inside this section will also be removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSectionToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => sectionToDelete && deleteSectionMutation.mutate(sectionToDelete.id)}
            disabled={deleteSectionMutation.isPending}
          >
            {deleteSectionMutation.isPending ? 'Deleting...' : 'Delete Section'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Lesson Dialog */}
      <Dialog
        open={Boolean(lessonToDelete)}
        onOpenChange={(open) => !open && setLessonToDelete(null)}
      >
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Lesson</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{lessonToDelete?.title}</strong>? Any associated quizzes and homework prompts will also be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setLessonToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => lessonToDelete && deleteLessonMutation.mutate(lessonToDelete.id)}
            disabled={deleteLessonMutation.isPending}
          >
            {deleteLessonMutation.isPending ? 'Deleting...' : 'Delete Lesson'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
