'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpenCheck,
  Send,
  Trash2,
  Loader2,
  Globe,
  FileText,
  HelpCircle,
  Layers,
  AlertCircle,
  Sparkles,
  Lightbulb,
  CheckSquare,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type TutorMode =
  | 'TUTOR'
  | 'SUMMARY'
  | 'FLASHCARDS'
  | 'EXPLAIN_SIMPLE'
  | 'PRACTICE_QUESTIONS'
  | 'HINTS';
type TutorLanguage = 'en' | 'bilingual' | 'am';

interface EnrolledCourse {
  courseId: string;
  course: {
    id: string;
    title: string;
    slug: string;
  };
}

interface TutorMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  mode: string;
  content: string;
  engine?: string | null;
  createdAt: string;
  course?: { id: string; title: string; slug: string } | null;
}

export default function StudentAiTutorPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [language, setLanguage] = useState<TutorLanguage>('en');
  const [question, setQuestion] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: status } = useQuery<{
    available: boolean;
    activeEngine: string;
    model: string;
  }>({
    queryKey: ['ai-status'],
    queryFn: () => apiClient.get('/ai/status'),
  });

  const { data: quota, refetch: refetchQuota } = useQuery<{
    dailyLimit: number;
    usedToday: number;
    remaining: number;
    resetsAt: string;
  }>({
    queryKey: ['ai-tutor-quota'],
    queryFn: () => apiClient.get('/ai/tutor/quota'),
    staleTime: 1000 * 30,
  });

  const { data: enrollmentsData } = useQuery<{ enrollments?: EnrolledCourse[] } | EnrolledCourse[]>({
    queryKey: ['my-enrollments-list'],
    queryFn: () => apiClient.get('/enrollments/me'),
  });

  const enrollments: EnrolledCourse[] = Array.isArray(enrollmentsData)
    ? enrollmentsData
    : enrollmentsData?.enrollments || [];

  const { data: history = [], isLoading: isHistoryLoading } = useQuery<TutorMessage[]>({
    queryKey: ['ai-tutor-workspace-history', selectedCourseId],
    queryFn: () => {
      const qs = selectedCourseId
        ? `?courseId=${encodeURIComponent(selectedCourseId)}`
        : '';
      return apiClient.get<TutorMessage[]>(`/ai/tutor/history${qs}`);
    },
  });

  const askMutation = useMutation({
    mutationFn: (payload: { prompt: string; mode: TutorMode }) =>
      apiClient.post<any>('/ai/tutor/ask', {
        question: payload.prompt,
        courseId: selectedCourseId && selectedCourseId.trim() ? selectedCourseId.trim() : undefined,
        mode: payload.mode,
        language,
      }),
    onSuccess: (response: any) => {
      setErrorMsg(null);
      setQuestion('');
      refetchQuota();
      queryClient.invalidateQueries({
        queryKey: ['ai-tutor-workspace-history', selectedCourseId],
      });
      if (response?.userMessage && response?.assistantMessage) {
        queryClient.setQueryData(
          ['ai-tutor-workspace-history', selectedCourseId],
          (prev: TutorMessage[] | undefined) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            const exists = list.some((m) => m.id === response.assistantMessage.id);
            if (!exists) {
              list.push(response.userMessage, response.assistantMessage);
            }
            return list;
          },
        );
      }
    },
    onError: (err: any) => {
      const msg = err?.message || '';
      if (msg.includes('limit of') || msg.includes('quota')) {
        setErrorMsg(msg);
      } else if (msg.includes('Enroll in this course')) {
        setErrorMsg(msg);
      } else if (msg && !msg.toLowerCase().includes('internal server error')) {
        setErrorMsg(msg);
      } else {
        setErrorMsg(
          'The study assistant encountered a temporary reconnection issue. Please retry or re-send your question.',
        );
      }
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => {
      const qs = selectedCourseId
        ? `?courseId=${encodeURIComponent(selectedCourseId)}`
        : '';
      return apiClient.delete(`/ai/tutor/history${qs}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ai-tutor-workspace-history', selectedCourseId],
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    askMutation.mutate({ prompt: question.trim(), mode: 'TUTOR' });
  };

  const engineLabel =
    status?.activeEngine === 'gemini'
      ? `Gemini (${status.model})`
      : status?.activeEngine === 'openai'
        ? `OpenAI (${status.model})`
        : 'Contextual Academic Engine (Offline Ready)';

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Guided Academic Tutor
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100 flex items-center gap-2.5">
            <BookOpenCheck className="h-7 w-7 text-brand-orange" />
            <span>AI Study Tutor</span>
          </h1>
          <p className="text-xs text-brand-slate dark:text-stone-400 mt-1">
            Ask syllabus questions, summarize complex topics, or generate revision flashcards tailored to your curriculum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {quota && (
            <Badge
              variant="outline"
              className="text-[11px] border-orange-200 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/40 text-brand-orange font-semibold"
            >
              <Zap className="h-3 w-3 mr-1" />
              {quota.remaining} / {quota.dailyLimit} queries remaining today
            </Badge>
          )}

          <Badge
            variant="outline"
            className="text-[11px] border-brand-border dark:border-stone-700 bg-brand-creamy dark:bg-stone-800 text-brand-coffee dark:text-stone-200"
          >
            <Sparkles className="h-3 w-3 text-brand-orange mr-1" />
            {engineLabel}
          </Badge>
        </div>
      </div>

      {/* Course Context & Language Bar */}
      <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="courseContext" className="text-xs font-semibold text-brand-coffee dark:text-stone-200">
              Course Syllabus Context
            </Label>
            <select
              id="courseContext"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-brand-border dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-xs text-brand-coffee dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            >
              <option value="">General Academic Study</option>
              {enrollments.map((enr) => (
                <option key={enr.course.id} value={enr.course.id}>
                  {enr.course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tutorLanguage" className="text-xs font-semibold text-brand-coffee dark:text-stone-200 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-brand-orange" />
              <span>Explanation Language</span>
            </Label>
            <select
              id="tutorLanguage"
              value={language}
              onChange={(e) => setLanguage(e.target.value as TutorLanguage)}
              className="flex h-9 w-full rounded-md border border-brand-border dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-xs text-brand-coffee dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            >
              <option value="en">Academic English</option>
              <option value="bilingual">English + Amharic Key Terms</option>
              <option value="am">Amharic Study Focus</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            askMutation.mutate({
              prompt: 'Explain the foundational core concepts of this subject in simple, everyday language with intuitive analogies.',
              mode: 'EXPLAIN_SIMPLE',
            })
          }
          className="h-8 text-xs gap-1.5 border-brand-border dark:border-stone-800 hover:border-brand-orange/40 hover:bg-orange-50/50"
        >
          <HelpCircle className="h-3.5 w-3.5 text-brand-orange" />
          <span>Explain Simply</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            askMutation.mutate({
              prompt: 'Generate 3-5 grounded multiple-choice practice questions strictly based on this course curriculum, with answer keys and explanations.',
              mode: 'PRACTICE_QUESTIONS',
            })
          }
          className="h-8 text-xs gap-1.5 border-brand-border dark:border-stone-800 hover:border-brand-orange/40 hover:bg-orange-50/50"
        >
          <CheckSquare className="h-3.5 w-3.5 text-brand-orange" />
          <span>Practice Questions</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            askMutation.mutate({
              prompt: 'Provide a concise overview summary and study checklist for this curriculum.',
              mode: 'SUMMARY',
            })
          }
          className="h-8 text-xs gap-1.5 border-brand-border dark:border-stone-800 hover:border-brand-orange/40 hover:bg-orange-50/50"
        >
          <FileText className="h-3.5 w-3.5 text-brand-orange" />
          <span>Lesson Summary</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            askMutation.mutate({
              prompt: 'Provide progressive Socratic hints and conceptual guidance for tackling assignments without giving direct answers.',
              mode: 'HINTS',
            })
          }
          className="h-8 text-xs gap-1.5 border-brand-border dark:border-stone-800 hover:border-brand-orange/40 hover:bg-orange-50/50"
        >
          <Lightbulb className="h-3.5 w-3.5 text-brand-orange" />
          <span>Assignment Hints</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={askMutation.isPending}
          onClick={() =>
            askMutation.mutate({
              prompt: 'Generate revision flashcards covering core concepts.',
              mode: 'FLASHCARDS',
            })
          }
          className="h-8 text-xs gap-1.5 border-brand-border dark:border-stone-800 hover:border-brand-orange/40 hover:bg-orange-50/50"
        >
          <Layers className="h-3.5 w-3.5 text-brand-orange" />
          <span>Revision Flashcards</span>
        </Button>

        {history.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={clearMutation.isPending}
            onClick={() => clearMutation.mutate()}
            className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear History</span>
          </Button>
        )}
      </div>

      {/* Conversation Thread */}
      <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {isHistoryLoading ? (
              <p className="text-xs text-brand-slate dark:text-stone-400">Loading study history...</p>
            ) : history.length === 0 ? (
              <div className="py-10 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-orange-100/80 text-brand-orange dark:bg-orange-950/60 dark:text-orange-400 mx-auto flex items-center justify-center">
                  <BookOpenCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-extrabold text-brand-coffee dark:text-stone-100">
                    Start an Academic Study Session
                  </p>
                  <p className="text-xs text-brand-slate dark:text-stone-400 max-w-md mx-auto">
                    Select an enrolled course above for curriculum-grounded guidance, or ask any academic question below.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto text-left pt-2">
                  <div className="p-2.5 rounded-lg border border-brand-border dark:border-stone-800 bg-brand-creamy/40 dark:bg-stone-800/40 text-[11px] text-brand-coffee dark:text-stone-300 flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                    <span><strong>Explain Simply:</strong> Break down difficult topics and academic theories with clear, relatable analogies.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-brand-border dark:border-stone-800 bg-brand-creamy/40 dark:bg-stone-800/40 text-[11px] text-brand-coffee dark:text-stone-300 flex items-start gap-2">
                    <CheckSquare className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                    <span><strong>Practice Questions:</strong> Self-test with grounded multiple-choice questions and detailed answer rationales.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-brand-border dark:border-stone-800 bg-brand-creamy/40 dark:bg-stone-800/40 text-[11px] text-brand-coffee dark:text-stone-300 flex items-start gap-2">
                    <FileText className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                    <span><strong>Lesson Summary:</strong> Extract key takeaways, core definitions, and fast revision checklists.</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-brand-border dark:border-stone-800 bg-brand-creamy/40 dark:bg-stone-800/40 text-[11px] text-brand-coffee dark:text-stone-300 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                    <span><strong>Assignment Hints:</strong> Socratic guidance pointing to key formulas and concepts without spoiling answers.</span>
                  </div>
                </div>
              </div>
            ) : (
              history.map((msg) => {
                const isUser = msg.role === 'USER';
                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-4 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-brand-coffee text-white dark:bg-stone-800 dark:text-stone-100 ml-6 sm:ml-12'
                        : 'bg-[#FDFBF7] dark:bg-stone-800/60 border border-brand-border dark:border-stone-700 text-brand-coffee dark:text-stone-100 mr-4 sm:mr-12'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                        {isUser ? 'Student' : 'EduVerse Study Tutor'}
                      </span>
                      <span className="text-[10px] opacity-70">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="whitespace-pre-line font-sans">{msg.content}</div>
                  </div>
                );
              })
            )}

            {askMutation.isPending && (
              <div className="flex items-center gap-2 text-xs text-brand-orange p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Preparing study explanation...</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start justify-between gap-3 text-xs text-red-700 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-red-700 dark:text-red-300 hover:opacity-75 font-semibold text-[11px] shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2 pt-3 border-t border-brand-border dark:border-stone-800">
            <Textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a conceptual question, request an example, or outline a study plan..."
              className="text-xs border-brand-border dark:border-stone-700 focus-visible:ring-brand-orange"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="orange"
                size="sm"
                disabled={!question.trim() || askMutation.isPending}
                className="text-xs gap-1.5 shadow-sm"
              >
                {askMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send Question</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
