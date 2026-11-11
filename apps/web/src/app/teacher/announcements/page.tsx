'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Send,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeacherCourseSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  course?: { id: string; title: string; slug: string } | null;
  author: { id: string; fullName: string };
}

export default function TeacherAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: coursesData } = useQuery<{ courses?: TeacherCourseSummary[] } | TeacherCourseSummary[]>({
    queryKey: ['teacher-courses-select'],
    queryFn: () => apiClient.get('/courses/teacher/my?limit=50'),
  });

  const courses: TeacherCourseSummary[] = Array.isArray(coursesData)
    ? coursesData
    : coursesData?.courses || [];

  const { data: announcements = [], isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ['teacher-announcements'],
    queryFn: () => apiClient.get<AnnouncementItem[]>('/announcements/teacher'),
  });

  const publishMutation = useMutation({
    mutationFn: (payload: { targetCourseId: string; title: string; content: string }) =>
      apiClient.post<{ announcement: AnnouncementItem; notifiedStudentsCount: number }>(
        '/announcements',
        {
          courseId: payload.targetCourseId,
          title: payload.title,
          content: payload.content,
        },
      ),
    onSuccess: (res) => {
      setErrorMsg(null);
      setTitle('');
      setContent('');
      setPublishResult(
        `Announcement published cleanly (${res.notifiedStudentsCount} enrolled student(s) notified).`,
      );
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
      setTimeout(() => setPublishResult(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to publish announcement.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
    },
  });

  const activeCourseId = courseId || courses[0]?.id || '';

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourseId || !title.trim() || !content.trim() || publishMutation.isPending) return;
    if (!courseId && courses[0]?.id) {
      setCourseId(courses[0].id);
    }
    publishMutation.mutate({
      targetCourseId: activeCourseId,
      title: title.trim(),
      content: content.trim(),
    });
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Cohort Communication
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy dark:text-white flex items-center gap-2.5">
            <Megaphone className="h-7 w-7 text-brand-emerald" />
            <span>Course Announcements</span>
          </h1>
          <p className="text-xs text-brand-slate dark:text-slate-400 mt-0.5">
            Broadcast syllabus updates, lab deadline reminders, and office hours directly to enrolled learners.
          </p>
        </div>

        <Link href="/teacher/dashboard">
          <Button variant="outline" size="sm" className="text-xs">
            Studio Dashboard
          </Button>
        </Link>
      </div>

      {publishResult && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
          <AlertDescription className="text-xs font-medium">{publishResult}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Composer Card */}
      <Card className="border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-3 border-b border-brand-border/60 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-brand-navy dark:text-white">
            Publish New Course Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {courses.length === 0 ? (
            <p className="text-xs text-brand-slate dark:text-slate-400">
              Create a course first before publishing cohort announcements.
            </p>
          ) : (
            <form onSubmit={handlePublish} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="annCourse" className="text-xs font-semibold text-brand-navy dark:text-slate-200">
                  Target Course
                </Label>
                <select
                  id="annCourse"
                  value={activeCourseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-brand-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-brand-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-emerald"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="annTitle" className="text-xs font-semibold text-brand-navy dark:text-slate-200">
                  Announcement Headline
                </Label>
                <Input
                  id="annTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Week 4 Live Lab Schedule & Reading Materials"
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="annContent" className="text-xs font-semibold text-brand-navy dark:text-slate-200">
                  Message Content
                </Label>
                <Textarea
                  id="annContent"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write clear, concise instructions for your students..."
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="emerald"
                  size="sm"
                  disabled={publishMutation.isPending || title.trim().length < 3 || content.trim().length < 5}
                  className="text-xs gap-1.5"
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Broadcast Announcement</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Published History */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-brand-navy dark:text-white">
          Published Notices ({announcements.length})
        </h2>

        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : announcements.length === 0 ? (
          <Card className="border-brand-border dark:border-slate-800">
            <CardContent className="p-8 text-center text-xs text-brand-slate dark:text-slate-400">
              No announcements have been published yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <Card key={ann.id} className="border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                        {ann.title}
                      </h3>
                      {ann.course && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ann.course.title}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-brand-slate dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {ann.content}
                    </p>
                    <span className="text-[10px] text-brand-slate dark:text-slate-400 block">
                      Posted on {new Date(ann.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(ann.id)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2 shrink-0"
                    title="Delete Announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
