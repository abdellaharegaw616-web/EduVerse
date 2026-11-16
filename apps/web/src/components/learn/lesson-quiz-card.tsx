'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertCircle,
  RotateCcw,
  Send,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

interface QuizQuestion {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  points: number;
  sortOrder: number;
  options: Array<{ id: string; text: string }>;
}

interface StudentQuizData {
  id: string;
  title: string;
  passingScore: number;
  timeLimitMinutes?: number | null;
  attemptLimit: number;
  remainingAttempts: number;
  previousAttemptsCount: number;
  bestScore?: number | null;
  hasPassed: boolean;
  questions: QuizQuestion[];
}

interface GradedSubmissionResponse {
  attemptId: string;
  quizId: string;
  score: number;
  passingScore: number;
  passed: boolean;
  earnedPoints: number;
  totalPoints: number;
  attemptNumber: number;
  remainingAttempts: number;
  breakdown: Array<{
    questionId: string;
    questionText?: string;
    type?: string;
    isCorrect: boolean;
    pointsEarned: number;
    pointsPossible: number;
    selectedAnswer?: string;
    correctAnswer?: string;
    explanation?: string;
  }>;
}

interface LessonQuizCardProps {
  quizId: string;
  onPassed?: () => void;
}

export function LessonQuizCard({ quizId, onPassed }: LessonQuizCardProps) {
  const queryClient = useQueryClient();

  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; textAnswer?: string }>>({});
  const [submissionResult, setSubmissionResult] = useState<GradedSubmissionResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. Fetch Quiz (Questions without correct answers)
  const {
    data: quiz,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<StudentQuizData>({
    queryKey: ['student-quiz', quizId],
    queryFn: () => apiClient.get<StudentQuizData>(`/assessments/quizzes/${quizId}`),
    enabled: !!quizId,
  });

  // 2. Countdown Timer
  useEffect(() => {
    if (!isTakingQuiz || secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTakingQuiz, secondsRemaining]);

  // 3. Quiz Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!quiz) throw new Error('Quiz not loaded');

      const formattedAnswers = quiz.questions.map((q) => {
        const studentAns = answers[q.id];
        return {
          questionId: q.id,
          selectedOptionId: studentAns?.selectedOptionId,
          textAnswer: studentAns?.textAnswer?.trim(),
        };
      });

      return apiClient.post<GradedSubmissionResponse>(`/assessments/quizzes/${quizId}/submit`, {
        answers: formattedAnswers,
        startedAt: startedAt || new Date().toISOString(),
      });
    },
    onSuccess: (data) => {
      setSubmissionResult(data);
      setIsTakingQuiz(false);
      setSubmitError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['my-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['course-player'] });

      if (data.passed && onPassed) {
        onPassed();
      }
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Failed to submit quiz. Please try again.');
    },
  });

  const handleStartQuiz = () => {
    setIsTakingQuiz(true);
    setSubmissionResult(null);
    setSubmitError(null);
    setAnswers({});
    const startTime = new Date().toISOString();
    setStartedAt(startTime);

    if (quiz?.timeLimitMinutes) {
      setSecondsRemaining(quiz.timeLimitMinutes * 60);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selectedOptionId: optionId },
    }));
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { textAnswer: text },
    }));
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800 text-white">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/3 bg-slate-800" />
          <Skeleton className="h-20 w-full bg-slate-800" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !quiz) {
    return (
      <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          {(error as any)?.message || 'Failed to load lesson quiz assessment.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="bg-[#19100C] border border-[#2A1B14] text-white shadow-xl overflow-hidden">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A1B14] pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-orange flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Lesson Knowledge Check</span>
            </span>
            <h3 className="text-lg font-black text-white">{quiz.title}</h3>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Badge variant="outline" className="border-[#38241B] text-stone-300">
              Pass Threshold: {quiz.passingScore}%
            </Badge>
            {quiz.timeLimitMinutes && (
              <Badge variant="outline" className="border-[#38241B] text-stone-300 flex items-center gap-1">
                <Clock className="h-3 w-3 text-brand-orange" />
                <span>{quiz.timeLimitMinutes} min limit</span>
              </Badge>
            )}
            <Badge variant="outline" className="border-[#38241B] text-stone-300">
              Attempts: {quiz.previousAttemptsCount}/{quiz.attemptLimit}
            </Badge>
          </div>
        </div>

        {/* State A: Graded Submission Results View */}
        {submissionResult && !isTakingQuiz && (
          <div className="space-y-6 p-6 rounded-xl bg-[#120B08] border border-[#2A1B14]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {submissionResult.passed ? (
                  <div className="h-12 w-12 rounded-full bg-orange-500/20 text-brand-orange flex items-center justify-center border border-orange-500/30">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <XCircle className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-base text-white">
                    {submissionResult.passed ? 'Assessment Passed! 🎉' : 'Assessment Not Passed'}
                  </h4>
                  <p className="text-xs text-stone-400">
                    You scored <strong className="text-white font-mono">{submissionResult.score}%</strong> (Passing threshold: {submissionResult.passingScore}%) • {submissionResult.earnedPoints}/{submissionResult.totalPoints} points
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {submissionResult.remainingAttempts > 0 && !submissionResult.passed ? (
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={handleStartQuiz}
                    className="gap-1.5 text-xs h-9 shadow-sm"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retake Quiz ({submissionResult.remainingAttempts} attempts remaining)</span>
                  </Button>
                ) : submissionResult.remainingAttempts === 0 && !submissionResult.passed ? (
                  <Badge variant="outline" className="border-rose-900 bg-rose-950/40 text-rose-300 text-xs">
                    Maximum Attempts Reached
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Questions Breakdown with Explanations */}
            <div className="space-y-4 pt-4 border-t border-[#2A1B14]">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Detailed Results & Explanations
                </h5>
                <span className="text-[11px] text-stone-400 font-mono">
                  {submissionResult.breakdown.filter((b) => b.isCorrect).length} / {submissionResult.breakdown.length} Correct
                </span>
              </div>

              <div className="space-y-3">
                {submissionResult.breakdown.map((item, idx) => (
                  <div
                    key={item.questionId}
                    className={`p-4 rounded-xl border text-xs space-y-2.5 transition-colors ${
                      item.isCorrect
                        ? 'bg-orange-950/20 border-orange-800/40'
                        : 'bg-rose-950/20 border-rose-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {item.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span className="font-semibold text-white">
                          <span className="text-brand-orange font-bold mr-1.5">Question {idx + 1}:</span>
                          {item.questionText || `Question ${idx + 1}`}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[11px] shrink-0 px-2 py-0.5 rounded bg-[#19100C] border border-[#2A1B14] text-stone-300">
                        {item.isCorrect ? `+${item.pointsEarned}` : '0'} / {item.pointsPossible} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded bg-[#19100C]/80 border border-[#2A1B14] text-stone-300">
                        <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                          Your Answer:
                        </span>
                        <span className={item.isCorrect ? 'text-orange-300 font-medium' : 'text-rose-300 font-medium'}>
                          {item.selectedAnswer || 'No response selected'}
                        </span>
                      </div>

                      {!item.isCorrect && item.correctAnswer && (
                        <div className="p-2 rounded bg-orange-950/30 border border-orange-800/50 text-orange-200">
                          <span className="text-orange-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                            Expected Answer:
                          </span>
                          <span className="font-medium text-white">{item.correctAnswer}</span>
                        </div>
                      )}
                    </div>

                    {item.explanation && (
                      <div className="p-2.5 rounded bg-[#160E0A] border border-[#2A1B14] text-stone-300 text-[11px] leading-relaxed flex items-start gap-2">
                        <span className="text-brand-orange font-bold shrink-0">Rationale:</span>
                        <span>{item.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* State B: In-Progress Quiz Questionnaire */}
        {isTakingQuiz ? (
          <div className="space-y-8">
            {/* Timer Banner */}
            {secondsRemaining !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-mono font-semibold">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Time Remaining:</span>
                </span>
                <span className="text-sm font-bold">{formatTimer(secondsRemaining)}</span>
              </div>
            )}

            {submitError && (
              <Alert variant="destructive" className="bg-red-950/60 border-red-800 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Questions List */}
            <div className="space-y-6">
              {quiz.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-5 rounded-xl bg-[#120B08] border border-[#2A1B14] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-sm text-white leading-relaxed">
                      <span className="text-brand-orange font-bold mr-2">Q{idx + 1}.</span>
                      {q.text}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-mono bg-[#231712] px-2 py-0.5 rounded shrink-0">
                      {q.points} pts
                    </span>
                  </div>

                  {/* Multiple Choice / True-False Options */}
                  {q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE' ? (
                    <div className="space-y-2 pt-2">
                      {q.options.map((opt) => {
                        const isSelected = answers[q.id]?.selectedOptionId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.id)}
                            className={`w-full p-3 rounded-lg text-left text-xs transition-all flex items-center justify-between border ${
                              isSelected
                                ? 'bg-orange-950/40 border-brand-orange text-white ring-1 ring-brand-orange'
                                : 'bg-[#19100C] border-[#2A1B14] hover:bg-[#231712] text-stone-300'
                            }`}
                          >
                            <span>{opt.text}</span>
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-brand-orange bg-brand-orange' : 'border-stone-600'
                              }`}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Short Answer Input */
                    <div className="pt-2">
                      <Input
                        placeholder="Type your answer here..."
                        value={answers[q.id]?.textAnswer || ''}
                        onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                        className="bg-[#19100C] border-[#2A1B14] text-xs text-white focus-visible:ring-brand-orange"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-4 border-t border-[#2A1B14]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTakingQuiz(false)}
                className="border-[#38241B] text-stone-300 hover:bg-[#231712] text-xs"
              >
                Cancel Attempt
              </Button>

              <Button
                variant="orange"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="gap-2 text-xs shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitMutation.isPending ? 'Grading Answers...' : 'Submit Answers for Grading'}</span>
              </Button>
            </div>
          </div>
        ) : !submissionResult && (
          /* State C: Quiz Overview / Start Prompt */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-xl bg-[#120B08] border border-[#2A1B14]">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <HelpCircle className="h-5 w-5 text-brand-orange" />
                <h4 className="font-bold text-sm text-white">Test Your Understanding</h4>
              </div>
              <p className="text-xs text-stone-400 max-w-md">
                {quiz.questions.length} questions assessing core concepts from this lesson. Complete to verify your comprehension and earn lesson credit.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
              {quiz.remainingAttempts > 0 ? (
                <Button
                  variant="orange"
                  onClick={handleStartQuiz}
                  className="gap-2 text-xs font-semibold h-10 px-5 shadow-sm"
                >
                  <Award className="h-4 w-4" />
                  <span>{quiz.previousAttemptsCount > 0 ? 'Retake Quiz' : 'Start Knowledge Check'}</span>
                </Button>
              ) : (
                <Badge variant="destructive" className="py-1 px-3 text-xs">
                  Attempt Limit Reached
                </Badge>
              )}
              <span className="text-[11px] text-stone-500 font-mono">
                {quiz.remainingAttempts} of {quiz.attemptLimit} attempts remaining
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

