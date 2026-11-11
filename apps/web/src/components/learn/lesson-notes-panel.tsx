'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Save, Loader2, CheckCircle2, StickyNote, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LessonNoteResponse {
  id?: string;
  lessonId: string;
  title?: string | null;
  content: string;
  isBookmarked: boolean;
  updatedAt?: string | null;
}

interface LessonNotesPanelProps {
  lessonId: string;
  lessonTitle: string;
}

export function LessonNotesPanel({ lessonId, lessonTitle }: LessonNotesPanelProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(lessonTitle);
  const [content, setContent] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const { data: noteData, isLoading } = useQuery<LessonNoteResponse>({
    queryKey: ['lesson-note', lessonId],
    queryFn: () => apiClient.get<LessonNoteResponse>(`/notes/lesson/${lessonId}`),
    enabled: Boolean(lessonId),
  });

  useEffect(() => {
    if (noteData) {
      setTitle(noteData.title || lessonTitle);
      setContent(noteData.content || '');
      setIsBookmarked(Boolean(noteData.isBookmarked));
    }
  }, [noteData, lessonTitle]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.put<LessonNoteResponse>(`/notes/lesson/${lessonId}`, {
        title: title.trim() || lessonTitle,
        content,
        isBookmarked,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-note', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (nextState: boolean) =>
      apiClient.patch<LessonNoteResponse>(`/notes/lesson/${lessonId}/bookmark`, {
        isBookmarked: nextState,
      }),
    onSuccess: (updated) => {
      setIsBookmarked(updated.isBookmarked);
      queryClient.invalidateQueries({ queryKey: ['lesson-note', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
    },
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-brand-emerald" />
            <span>Personal Study Notebook</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Save personal notes and bookmark key lessons for offline/exam revision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={bookmarkMutation.isPending}
            onClick={() => bookmarkMutation.mutate(!isBookmarked)}
            className={`h-8 text-xs gap-1.5 ${
              isBookmarked
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark Lesson'}</span>
          </Button>

          <Link href="/app/notes">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-brand-mint hover:text-white gap-1"
            >
              <span>All Notes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-400">Loading your study notes...</p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="noteTitle" className="text-[11px] font-semibold text-slate-300">
              Note Heading
            </Label>
            <Input
              id="noteTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson note heading..."
              className="text-xs bg-slate-950 border-slate-800 text-slate-100 h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="noteBody" className="text-[11px] font-semibold text-slate-300">
              Study Notes & Takeaways
            </Label>
            <Textarea
              id="noteBody"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write key formulas, exam reminders, code snippets, or summary points..."
              className="text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-slate-400">
              {savedNotice ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved to your Study Notebook
                </span>
              ) : noteData?.updatedAt ? (
                <span>Last updated: {new Date(noteData.updatedAt).toLocaleString()}</span>
              ) : (
                <span>Not saved yet</span>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant="emerald"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="text-xs gap-1.5"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Save Study Note</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

