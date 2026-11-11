'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HelpCircle,
  ArrowLeft,
  PlusCircle,
  Trash2,
  Save,
  BookOpenCheck,
  Loader2,
  Check,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface QuestionOption {
  id?: string;
  text: string;
  isCorrect: boolean;
}

export default function TeacherQuizzesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params?.id as string;
  const initialLessonId = searchParams.get('lessonId');

  const queryClient = useQueryClient();

  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId || '');
  const [quizTitle, setQuizTitle] = useState('Knowledge Check');
  const [passingScore, setPassingScore] = useState(70);

  // New question draft form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  // AI Draft Questions state
  const [aiQuestionCount, setAiQuestionCount] = useState(3);
  const [aiDrafts, setAiDrafts] = useState<
    Array<{ text: string; points: number; options: QuestionOption[]; saved?: boolean }>
  >([]);
  const [aiEngineLabel, setAiEngineLabel] = useState<string | null>(null);

  // Load Course curriculum
  const { data: course } = useQuery({
    queryKey: ['teacher-course-detail', courseId],
    queryFn: () => apiClient.get<any>(`/courses/teacher/${courseId}`),
    enabled: Boolean(courseId),
  });

  // Extract all lessons across sections
  const allLessons =
    course?.sections?.flatMap((s: any) =>
      s.lessons.map((l: any) => ({ ...l, sectionTitle: s.title })),
    ) || [];

  // Pick first lesson if none selected
  const activeLesson = allLessons.find((l: any) => l.id === selectedLessonId) || allLessons[0];
  const activeLessonId = activeLesson?.id;

  // Load Quiz for active lesson
  const {
    data: quiz,
    isLoading: isQuizLoading,
  } = useQuery({
    queryKey: ['teacher-lesson-quiz', activeLessonId],
    queryFn: async () => {
      if (!activeLessonId) return null;
      const lesson = await apiClient.get<any>(`/courses/teacher/lessons/${activeLessonId}`);
      if (lesson?.quiz?.id) {
        return apiClient.get<any>(`/courses/teacher/quizzes/${lesson.quiz.id}`);
      }
      return null;
    },
    enabled: Boolean(activeLessonId),
  });

  // Create / Update Quiz
  const upsertQuizMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/courses/teacher/lessons/${activeLessonId}/quiz`, {
        title: quizTitle,
        passingScore: Number(passingScore),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson-quiz', activeLessonId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-course-detail', courseId] });
    },
  });

  // Add Question Mutation
  const addQuestionMutation = useMutation({
    mutationFn: (quizId: string) =>
      apiClient.post(`/courses/teacher/quizzes/${quizId}/questions`, {
        text: questionText,
        points: 1,
        options: options.filter((o) => o.text.trim()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson-quiz', activeLessonId] });
      setShowQuestionForm(false);
      setQuestionText('');
      setOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ]);
    },
  });

  // Delete Question Mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) =>
      apiClient.delete(`/courses/teacher/questions/${questionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson-quiz', activeLessonId] });
    },
  });

  // AI Generate Draft Questions Mutation
  const generateAiQuestionsMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{
        engine: string;
        model: string;
        questions: Array<{ text: string; points: number; options: QuestionOption[] }>;
      }>('/ai/teacher/generate-quiz', {
        lessonId: activeLessonId,
        questionCount: Number(aiQuestionCount),
      }),
    onSuccess: (res) => {
      setAiDrafts(res.questions.map((q) => ({ ...q, saved: false })));
      setAiEngineLabel(`${res.engine} (${res.model})`);
    },
  });

  const saveDraftQuestionMutation = useMutation({
    mutationFn: async ({
      quizId,
      draftIndex,
      draft,
    }: {
      quizId: string;
      draftIndex: number;
      draft: { text: string; points: number; options: QuestionOption[] };
    }) => {
      await apiClient.post(`/courses/teacher/quizzes/${quizId}/questions`, {
        text: draft.text,
        points: draft.points || 1,
        options: draft.options,
      });
      return draftIndex;
    },
    onSuccess: (savedIndex) => {
      setAiDrafts((prev) =>
        prev.map((item, idx) => (idx === savedIndex ? { ...item, saved: true } : item)),
      );
      queryClient.invalidateQueries({ queryKey: ['teacher-lesson-quiz', activeLessonId] });
    },
  });

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...options];
    const opt = updated[index];
    if (opt) {
      opt.text = text;
      setOptions(updated);
    }
  };

  const handleCorrectOptionSelect = (index: number) => {
    const updated = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(updated);
  };

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
            Quiz & Assessment Management
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Configure automated diagnostic checks, passing thresholds, and multiple-choice questions.
          </p>
        </div>
      </div>

      {/* Lesson Selector */}
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

      {/* Quiz Configuration */}
      {isQuizLoading ? (
        <Skeleton className="h-44 rounded-xl" />
      ) : (
        <Card className="border border-brand-border bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-purple-600" />
              <span>{quiz ? 'Quiz Configuration' : 'Create Quiz for This Lesson'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-navy">Quiz Title</Label>
                <Input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Module Diagnostic Evaluation"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-navy">Passing Threshold (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => upsertQuizMutation.mutate()}
              disabled={upsertQuizMutation.isPending}
              className="text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{quiz ? 'Update Quiz Settings' : 'Initialize Quiz'}</span>
            </Button>
          </CardContent>
        </Card>
      )}

          {/* Questions Section */}
      {quiz && (
        <div className="space-y-4">
          {/* AI Quiz Question Drafter */}
          <Card className="border border-brand-border dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-brand-navy dark:text-white flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4 text-brand-emerald" />
                    <span>AI Assessment Question Drafter</span>
                  </CardTitle>
                  <p className="text-[11px] text-brand-slate dark:text-slate-400 mt-0.5">
                    Analyze &ldquo;{activeLesson?.title}&rdquo; content and generate reviewable multiple-choice questions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={aiQuestionCount}
                    onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                    aria-label="Draft question count"
                    className="h-8 rounded-md border border-brand-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs text-brand-navy dark:text-slate-100"
                  >
                    <option value={2}>2 Questions</option>
                    <option value={3}>3 Questions</option>
                    <option value={4}>4 Questions</option>
                    <option value={5}>5 Questions</option>
                  </select>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => generateAiQuestionsMutation.mutate()}
                    disabled={!activeLessonId || generateAiQuestionsMutation.isPending}
                    className="h-8 text-xs gap-1.5"
                  >
                    {generateAiQuestionsMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <BookOpenCheck className="h-3.5 w-3.5 text-brand-emerald" />
                    )}
                    <span>Generate Drafts</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            {aiDrafts.length > 0 && (
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-brand-slate dark:text-slate-400 border-t border-brand-border/60 dark:border-slate-800 pt-3">
                  <span>Generated via {aiEngineLabel} — review before saving to quiz:</span>
                  <button
                    type="button"
                    onClick={() => setAiDrafts([])}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Dismiss Drafts
                  </button>
                </div>

                <div className="space-y-2.5">
                  {aiDrafts.map((draft, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-3.5 rounded-lg border border-brand-border dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-bold text-brand-navy dark:text-white">
                          Draft {dIdx + 1}: {draft.text}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant={draft.saved ? 'outline' : 'emerald'}
                          disabled={draft.saved || saveDraftQuestionMutation.isPending}
                          onClick={() =>
                            saveDraftQuestionMutation.mutate({
                              quizId: quiz.id,
                              draftIndex: dIdx,
                              draft,
                            })
                          }
                          className="h-7 text-[11px] gap-1 shrink-0"
                        >
                          {draft.saved ? (
                            <>
                              <Check className="h-3 w-3 text-brand-emerald" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <PlusCircle className="h-3 w-3" />
                              <span>Add to Quiz</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {draft.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`px-2.5 py-1.5 rounded text-[11px] border ${
                              opt.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-brand-slate dark:text-slate-400'
                            }`}
                          >
                            {opt.isCorrect ? '✓ ' : ''}
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-navy flex items-center gap-2">
              <span>Questions & Options</span>
              <Badge variant="outline" className="text-xs">
                {quiz.questions?.length || 0} Questions
              </Badge>
            </h2>

            {!showQuestionForm && (
              <Button
                variant="emerald"
                size="sm"
                onClick={() => setShowQuestionForm(true)}
                className="text-xs gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Add Question</span>
              </Button>
            )}
          </div>

          {/* New Question Form */}
          {showQuestionForm && (
            <Card className="border-2 border-brand-emerald bg-emerald-50/20 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-brand-navy">
                  New Multiple Choice Question
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-brand-navy">Question Text</Label>
                  <Input
                    placeholder="e.g. Which keyword ensures immutability in TypeScript?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-brand-navy">
                    Answer Options (Select the correct answer radio):
                  </Label>
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={opt.isCorrect}
                        onChange={() => handleCorrectOptionSelect(i)}
                        className="h-4 w-4 text-brand-emerald accent-brand-emerald cursor-pointer"
                        title="Mark as correct option"
                      />
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(i, e.target.value)}
                        className="text-xs bg-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => addQuestionMutation.mutate(quiz.id)}
                    disabled={
                      !questionText.trim() ||
                      options.filter((o) => o.text.trim()).length < 2 ||
                      addQuestionMutation.isPending
                    }
                    className="text-xs"
                  >
                    Save Question
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuestionForm(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions List */}
          {quiz.questions && quiz.questions.length > 0 ? (
            <div className="space-y-3">
              {quiz.questions.map((q: any, idx: number) => (
                <Card key={q.id} className="border border-brand-border bg-white shadow-xs">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-brand-navy">
                        {idx + 1}. {q.text}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options?.map((opt: any) => (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-md text-xs border ${
                              opt.isCorrect
                                ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-brand-slate'
                            }`}
                          >
                            {opt.isCorrect && '✓ '}
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestionMutation.mutate(q.id)}
                      className="text-red-600 hover:bg-red-50 p-1.5 h-7"
                      title="Delete Question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-slate text-center py-4 bg-slate-50 rounded-xl border border-brand-border">
              No questions created yet. Click "Add Question" above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
