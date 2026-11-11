'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpenCheck,
  Send,
  Trash2,
  Loader2,
  FileText,
  Layers,
  HelpCircle,
  Globe,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export type TutorMode = 'TUTOR' | 'SUMMARY' | 'FLASHCARDS' | 'EXPLAIN_SIMPLE';
export type TutorLanguage = 'en' | 'bilingual' | 'am';

interface TutorMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  mode: string;
  content: string;
  engine?: string | null;
  createdAt: string;
}

interface AiStatusResponse {
  available: boolean;
  activeEngine: 'gemini' | 'openai' | 'contextual-offline';
  model: string;
}

interface LessonAiTutorProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  theme?: 'dark' | 'light';
}

export function LessonAiTutor({
  courseId,
  lessonId,
  lessonTitle,
  theme = 'dark',
}: LessonAiTutorProps) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState<TutorLanguage>('en');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: status } = useQuery<AiStatusResponse>({
    queryKey: ['ai-status'],
    queryFn: () => apiClient.get<AiStatusResponse>('/ai/status'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: history = [], isLoading: isHistoryLoading } = useQuery<TutorMessage[]>({
    queryKey: ['ai-tutor-history', courseId, lessonId],
    queryFn: () =>
      apiClient.get<TutorMessage[]>(
        `/ai/tutor/history?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(lessonId)}`,
      ),
    enabled: Boolean(lessonId),
  });

  const askMutation = useMutation({
    mutationFn: (payload: { prompt: string; mode: TutorMode }) =>
      apiClient.post<any>('/ai/tutor/ask', {
        question: payload.prompt,
        courseId,
        lessonId,
        mode: payload.mode,
        language,
      }),
    onSuccess: () => {
      setErrorMsg(null);
      setQuestion('');
      queryClient.invalidateQueries({
        queryKey: ['ai-tutor-history', courseId, lessonId],
      });
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Unable to generate study assistance right now.');
    },
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      apiClient.delete(
        `/ai/tutor/history?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(lessonId)}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ai-tutor-history', courseId, lessonId],
      });
    },
  });

  const handleQuickAction = (mode: TutorMode, defaultPrompt: string) => {
    askMutation.mutate({ prompt: defaultPrompt, mode });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    askMutation.mutate({ prompt: question.trim(), mode: 'TUTOR' });
  };

  const isDark = theme === 'dark';

  const engineLabel =
    status?.activeEngine === 'gemini'
      ? `Gemini (${status.model})`
      : status?.activeEngine === 'openai'
        ? `OpenAI (${status.model})`
        : 'Contextual Academic Engine (Offline-Ready)';

  return (
    <div
      className={
        isDark
          ? 'bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4'
          : 'bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4'
      }
    >
      {/* Header & Engine Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="space-y-0.5">
          <h3
            className={`text-sm font-bold flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-brand-navy dark:text-white'
            }`}
          >
            <BookOpenCheck className="h-4 w-4 text-brand-emerald" />
            <span>Academic Study Assistant</span>
          </h3>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-brand-slate dark:text-slate-400'}`}>
            Grounded in: <strong className={isDark ? 'text-slate-200' : 'text-brand-navy dark:text-slate-200'}>{lessonTitle}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              isDark
                ? 'border-slate-700 text-slate-300 text-[10px] font-medium'
                : 'border-brand-border text-brand-slate text-[10px] font-medium'
            }
          >
            {engineLabel}
          </Badge>

          <div className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as TutorLanguage)}
              aria-label="Study assistant language"
              className={
                isDark
                  ? 'h-7 rounded border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-emerald'
                  : 'h-7 rounded border border-brand-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] text-brand-navy dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-emerald'
              }
            >
              <option value="en">English</option>
              <option value="bilingual">English + Amharic Hints</option>
              <option value="am">Amharic Focus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Study Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            handleQuickAction('SUMMARY', `Provide a concise study summary of "${lessonTitle}".`)
          }
          className={
            isDark
              ? 'h-8 text-xs border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800 gap-1.5'
              : 'h-8 text-xs gap-1.5'
          }
        >
          <FileText className="h-3.5 w-3.5 text-brand-emerald" />
          <span>Summarize Lesson</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            handleQuickAction('EXPLAIN_SIMPLE', `Explain "${lessonTitle}" in simple beginner terms.`)
          }
          className={
            isDark
              ? 'h-8 text-xs border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800 gap-1.5'
              : 'h-8 text-xs gap-1.5'
          }
        >
          <HelpCircle className="h-3.5 w-3.5 text-brand-emerald" />
          <span>Explain Simply</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            handleQuickAction('FLASHCARDS', `Create revision flashcards from "${lessonTitle}".`)
          }
          className={
            isDark
              ? 'h-8 text-xs border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800 gap-1.5'
              : 'h-8 text-xs gap-1.5'
          }
        >
          <Layers className="h-3.5 w-3.5 text-brand-emerald" />
          <span>Study Flashcards</span>
        </Button>

        {history.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={clearMutation.isPending}
            onClick={() => clearMutation.mutate()}
            className="h-8 text-xs text-slate-400 hover:text-red-400 ml-auto gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Thread</span>
          </Button>
        )}
      </div>

      {/* Conversation History */}
      <div
        className={
          isDark
            ? 'space-y-3 max-h-96 overflow-y-auto pr-1 bg-slate-950/50 border border-slate-800/80 rounded-lg p-3.5'
            : 'space-y-3 max-h-96 overflow-y-auto pr-1 bg-slate-50 dark:bg-slate-950/50 border border-brand-border dark:border-slate-800 rounded-lg p-3.5'
        }
      >
        {isHistoryLoading ? (
          <p className="text-xs text-slate-400">Loading study conversation...</p>
        ) : history.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-brand-navy dark:text-slate-300'}`}>
              No study questions asked for this lesson yet.
            </p>
            <p className="text-[11px] text-slate-400">
              Select a quick study action above or ask a question about the lesson material below.
            </p>
          </div>
        ) : (
          history.map((msg) => {
            const isUser = msg.role === 'USER';
            return (
              <div
                key={msg.id}
                className={`rounded-lg p-3 text-xs leading-relaxed ${
                  isUser
                    ? isDark
                      ? 'bg-brand-navy/80 border border-slate-700 text-white ml-6'
                      : 'bg-brand-navy text-white ml-6'
                    : isDark
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'
                      : 'bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 text-brand-navy dark:text-slate-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-emerald">
                    {isUser ? 'You' : 'EduVerse Tutor'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="whitespace-pre-line font-sans">{msg.content}</div>
              </div>
            );
          })
        )}

        {askMutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-brand-emerald p-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Synthesizing academic explanation...</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
      )}

      {/* Ask Form */}
      <form onSubmit={handleSend} className="space-y-2">
        <Textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this lesson, request a worked example, or clarify terminology..."
          className={
            isDark
              ? 'text-xs bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500'
              : 'text-xs'
          }
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant="emerald"
            disabled={!question.trim() || askMutation.isPending}
            className="text-xs gap-1.5"
          >
            {askMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Ask Study Tutor</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

