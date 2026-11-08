'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Send,
  Paperclip,
  Check,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface AssignmentDetails {
  id: string;
  title: string;
  instructions: string;
  maxScore: number;
  dueDate?: string | null;
  isLate: boolean;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  submission?: {
    id: string;
    content?: string | null;
    fileUrl?: string | null;
    status: 'PENDING' | 'GRADED' | 'RETURNED';
    grade?: number | null;
    feedback?: string | null;
    submittedAt?: string | null;
    gradedAt?: string | null;
  } | null;
}

interface LessonAssignmentCardProps {
  assignmentId: string;
  onSubmitted?: () => void;
}

export function LessonAssignmentCard({ assignmentId, onSubmitted }: LessonAssignmentCardProps) {
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 1. Fetch Assignment Details & Existing Student Submission
  const {
    data: assignment,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AssignmentDetails>({
    queryKey: ['assignment-details', assignmentId],
    queryFn: () => apiClient.get<AssignmentDetails>(`/assignments/${assignmentId}`),
    enabled: !!assignmentId,
  });

  // 2. Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!content.trim() && !fileUrl.trim()) {
        throw new Error('Please provide either written notes/code or a document file URL.');
      }

      return apiClient.post(`/assignments/${assignmentId}/submit`, {
        content: content.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        fileName: fileName.trim() || (fileUrl.trim() ? fileUrl.split('/').pop() : undefined),
      });
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setSubmitError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['course-player'] });

      if (onSubmitted) {
        onSubmitted();
      }
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Failed to submit assignment. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800 text-white">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/3 bg-slate-800" />
          <Skeleton className="h-24 w-full bg-slate-800" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !assignment) {
    return (
      <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          {(error as any)?.message || 'Failed to load lesson assignment.'}
        </AlertDescription>
      </Alert>
    );
  }

  const existingSub = assignment.submission;
  const isDeadlinePassed = assignment.isLate;

  return (
    <Card className="bg-slate-900 border-slate-800 text-white shadow-xl overflow-hidden">
      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-mint flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>Module Assignment Deliverable</span>
            </span>
            <h3 className="text-lg font-black text-white">{assignment.title}</h3>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              Max Score: {assignment.maxScore} pts
            </Badge>
            {assignment.dueDate && (
              <Badge
                variant="outline"
                className={`border-slate-700 flex items-center gap-1 ${
                  isDeadlinePassed ? 'text-rose-400 border-rose-900' : 'text-slate-300'
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  {isDeadlinePassed ? ' (Expired)' : ''}
                </span>
              </Badge>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-brand-mint" />
            <span>Instructions & Requirements</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {assignment.instructions}
          </p>
        </div>

        {/* State A: Graded Feedback Card */}
        {existingSub && existingSub.status === 'GRADED' && (
          <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Evaluation Complete</span>
              </div>
              <span className="text-sm font-mono font-extrabold text-emerald-300">
                Grade: {existingSub.grade} / {assignment.maxScore}
              </span>
            </div>

            {existingSub.feedback && (
              <div className="pt-2 border-t border-emerald-900/50 text-xs text-emerald-200">
                <strong className="block text-emerald-400 font-semibold mb-1">
                  Instructor Feedback:
                </strong>
                <p className="leading-relaxed whitespace-pre-line">{existingSub.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* State B: Pending Submission Banner */}
        {existingSub && existingSub.status === 'PENDING' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Your work was submitted on{' '}
                {existingSub.submittedAt ? new Date(existingSub.submittedAt).toLocaleDateString() : 'recent'}. It is currently under review by your course instructor.
              </span>
            </div>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 shrink-0">
              Pending Review
            </Badge>
          </div>
        )}

        {/* State C: Submission Form (Visible if not graded) */}
        {(!existingSub || existingSub.status === 'PENDING') && (
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-brand-mint" />
              <span>{existingSub ? 'Update Your Submission' : 'Submit Your Solution'}</span>
            </h4>

            {submitError && (
              <Alert variant="destructive" className="bg-red-950/60 border-red-800 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{submitError}</AlertDescription>
              </Alert>
            )}

            {submitSuccess && (
              <Alert className="bg-emerald-950/60 border-emerald-800 text-emerald-200">
                <Check className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your assignment was successfully submitted and saved.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Written Response / Code Implementation / Explanation
                </label>
                <Textarea
                  placeholder="Paste your architecture specification, written code, or answers here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isDeadlinePassed}
                  rows={4}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    <span>Attached Document URL (PDF, ZIP, DOCX, IPYNB)</span>
                  </label>
                  <Input
                    placeholder="https://cdn.eduverse.et/uploads/assignment_solution.pdf"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    disabled={isDeadlinePassed}
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    File Name (e.g. cloud_spec.pdf)
                  </label>
                  <Input
                    placeholder="cloud_spec.pdf"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    disabled={isDeadlinePassed}
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Allowed formats: PDF, ZIP, DOCX, TXT, PY, IPYNB (Max 25MB).
              </span>

              <Button
                variant="emerald"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || isDeadlinePassed}
                className="gap-2 text-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {isDeadlinePassed
                    ? 'Deadline Expired'
                    : submitMutation.isPending
                    ? 'Submitting...'
                    : existingSub
                    ? 'Update Submission'
                    : 'Submit Assignment'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
