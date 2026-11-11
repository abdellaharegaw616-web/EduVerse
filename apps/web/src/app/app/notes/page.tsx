'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StickyNote,
  Bookmark,
  Search,
  ExternalLink,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface NoteItem {
  id: string;
  lessonId: string;
  courseId: string;
  title?: string | null;
  content: string;
  isBookmarked: boolean;
  updatedAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
  };
  lesson: {
    id: string;
    title: string;
    slug: string;
    type: string;
    durationMinutes: number;
    section: { id: string; title: string };
  };
}

export default function StudentNotebookPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  const { data: notes = [], isLoading } = useQuery<NoteItem[]>({
    queryKey: ['my-notes', bookmarkedOnly, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (bookmarkedOnly) params.set('bookmarkedOnly', 'true');
      if (search.trim()) params.set('search', search.trim());
      return apiClient.get<NoteItem[]>(`/notes?${params.toString()}`);
    },
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: ({ lessonId, nextState }: { lessonId: string; nextState: boolean }) =>
      apiClient.patch(`/notes/lesson/${lessonId}/bookmark`, { isBookmarked: nextState }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (lessonId: string) => apiClient.delete(`/notes/lesson/${lessonId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
    },
  });

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Personal Revision Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy dark:text-white">
            Study Notebook & Bookmarks
          </h1>
          <p className="text-xs text-brand-slate dark:text-slate-400 mt-0.5">
            Search your personal lesson notes, review bookmarked topics, and jump directly back to any module.
          </p>
        </div>

        <Link href="/app/courses">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            <span>My Courses</span>
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-brand-slate absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by keyword, lesson, or course..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBookmarkedOnly(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              !bookmarkedOnly
                ? 'bg-brand-navy text-white'
                : 'bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 text-brand-slate dark:text-slate-300'
            }`}
          >
            All Notes
          </button>
          <button
            type="button"
            onClick={() => setBookmarkedOnly(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              bookmarkedOnly
                ? 'bg-brand-navy text-white'
                : 'bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 text-brand-slate dark:text-slate-300'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Bookmarked Only</span>
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={bookmarkedOnly ? 'No Bookmarked Lessons Yet' : 'Your Study Notebook is Empty'}
          description="Open any lesson inside the Course Learning Player to save personal revision notes or bookmark important topics."
          actionHref="/app/courses"
          actionLabel="Go to My Courses"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="border border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <Badge variant="secondary" className="text-[10px]">
                      {note.course.title}
                    </Badge>
                    <h3 className="font-bold text-sm text-brand-navy dark:text-white line-clamp-1">
                      {note.title || note.lesson.title}
                    </h3>
                    <p className="text-[11px] text-brand-slate dark:text-slate-400">
                      {note.lesson.section.title} → {note.lesson.title}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleBookmarkMutation.mutate({
                        lessonId: note.lessonId,
                        nextState: !note.isBookmarked,
                      })
                    }
                    title={note.isBookmarked ? 'Remove Bookmark' : 'Bookmark Lesson'}
                    className={`p-1.5 rounded-md border transition-colors ${
                      note.isBookmarked
                        ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-600/40 dark:bg-amber-950/30 dark:text-amber-400'
                        : 'border-brand-border dark:border-slate-700 text-slate-400 hover:text-brand-navy'
                    }`}
                  >
                    <Bookmark
                      className={`h-4 w-4 ${note.isBookmarked ? 'fill-current' : ''}`}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-brand-border/60 dark:border-slate-800 text-xs text-brand-navy dark:text-slate-300 whitespace-pre-line max-h-36 overflow-y-auto">
                  {note.content.trim()
                    ? note.content
                    : 'Bookmarked lesson for quick revision (no text notes recorded yet).'}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-brand-border/60 dark:border-slate-800">
                  <span className="text-[10px] text-brand-slate dark:text-slate-400">
                    Updated {new Date(note.updatedAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNoteMutation.mutate(note.lessonId)}
                      className="h-7 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Delete Note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <Link href={`/courses/${note.course.slug}/learn?lesson=${note.lessonId}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <span>Open Lesson</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

