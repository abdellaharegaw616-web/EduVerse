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
