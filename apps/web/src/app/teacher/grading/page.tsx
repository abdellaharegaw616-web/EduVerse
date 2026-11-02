'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck2,
  CheckCircle2,
  ExternalLink,
  Award,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SubmissionItem {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  courseTitle: string;
  lessonTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  content?: string | null;
  fileUrl?: string | null;
  status: 'PENDING' | 'GRADED' | 'RETURNED';
  grade?: number | null;
  feedback?: string | null;
  submittedAt: string;
  gradedAt?: string | null;
}

export default function TeacherGradingQueuePage() {
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'GRADED' | 'ALL'>('PENDING');
  const [activeSubmission, setActiveSubmission] = useState<SubmissionItem | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [gradeError, setGradeError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const {
    data: submissions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SubmissionItem[]>({
    queryKey: ['teacher-submissions', statusFilter],
    queryFn: () =>
      apiClient.get<SubmissionItem[]>(
        `/courses/teacher/assignments/submissions?status=${statusFilter}`,
      ),
  });

  const gradeMutation = useMutation({
    mutationFn: ({ id, grade, feedback }: { id: string; grade: number; feedback: string }) =>
      apiClient.patch(`/courses/teacher/assignments/submissions/${id}/grade`, {
        grade,
        feedback,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      setActiveSubmission(null);
      setGradeError(null);
    },
  });

  const openGradingModal = (sub: SubmissionItem) => {
    setActiveSubmission(sub);
    setGradeInput(sub.grade !== null && sub.grade !== undefined ? sub.grade : sub.maxScore);
    setFeedbackInput(sub.feedback || '');
    setGradeError(null);
  };

  const handleGradeSubmit = () => {
    if (!activeSubmission) return;
    if (gradeInput < 0 || gradeInput > activeSubmission.maxScore) {
      setGradeError(`Score must be between 0 and ${activeSubmission.maxScore}`);
      return;
    }
    gradeMutation.mutate({
      id: activeSubmission.id,
      grade: Number(gradeInput),
      feedback: feedbackInput,
    });
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Evaluation Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Submission Review & Grading Queue
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Audit student project deliverables, assign scores, and deliver qualitative mentorship feedback.
          </p>
        </div>

        <Link href="/teacher/dashboard">
          <Button variant="outline" size="sm">
            Studio Dashboard
          </Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Grading Queue Retrieval Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to fetch assignment submissions.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'PENDING'
              ? 'bg-brand-navy text-white shadow-xs'
              : 'bg-white border border-brand-border text-brand-slate hover:text-brand-navy'
          }`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setStatusFilter('GRADED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'GRADED'
              ? 'bg-brand-navy text-white shadow-xs'
              : 'bg-white border border-brand-border text-brand-slate hover:text-brand-navy'
          }`}
        >
          Graded
        </button>
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'ALL'
              ? 'bg-brand-navy text-white shadow-xs'
              : 'bg-white border border-brand-border text-brand-slate hover:text-brand-navy'
          }`}
        >
          All Submissions
        </button>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : submissions && submissions.length > 0 ? (
        <div className="rounded-xl border border-brand-border bg-white divide-y divide-brand-border overflow-hidden shadow-xs">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-brand-navy">{sub.assignmentTitle}</h3>
                  {sub.status === 'PENDING' ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                      Pending Review
                    </Badge>
                  ) : (
                    <Badge variant="emerald" className="gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Graded ({sub.grade}/{sub.maxScore})
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-brand-slate">
                  Student: <strong className="text-brand-navy">{sub.studentName}</strong> ({sub.studentEmail}) •{' '}
                  {sub.courseTitle}
                </p>

                <span className="text-[10px] text-brand-slate/80 block">
                  Submitted: {new Date(sub.submittedAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {sub.grade !== null && sub.grade !== undefined && (
                  <div className="text-right">
                    <span className="text-base font-extrabold text-brand-navy block leading-none">
                      {sub.grade} / {sub.maxScore}
                    </span>
                    <span className="text-[10px] text-brand-slate">Score</span>
                  </div>
                )}

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openGradingModal(sub)}
                  className="h-8 text-xs gap-1.5"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  <span>{sub.status === 'PENDING' ? 'Grade Submission' : 'Edit Evaluation'}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileCheck2}
          title={statusFilter === 'PENDING' ? 'No Submissions Waiting' : 'No Submissions Found'}
          description={
            statusFilter === 'PENDING'
              ? 'All student deliverables have been reviewed. Outstanding work!'
              : 'Submissions for your authored course assignments will appear here.'
          }
          actionHref="/teacher/courses"
          actionLabel="View Courses"
        />
      )}

      {/* Grade Dialog Modal */}
      <Dialog
        open={Boolean(activeSubmission)}
        onOpenChange={(open) => !open && setActiveSubmission(null)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-emerald" />
            <span>Grade Deliverable: {activeSubmission?.assignmentTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Student: <strong>{activeSubmission?.studentName}</strong> ({activeSubmission?.studentEmail})
          </DialogDescription>
        </DialogHeader>

        {activeSubmission && (
          <div className="space-y-4 my-2">
            {/* Student Deliverable Content */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-brand-navy">Student Submission Content</Label>
              <div className="p-3 bg-slate-50 rounded-lg border border-brand-border text-xs text-brand-navy font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                {activeSubmission.content || 'No text content provided.'}
              </div>
              {activeSubmission.fileUrl && (
                <div className="pt-1">
                  <a
                    href={activeSubmission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-emerald font-semibold hover:underline"
                  >
                    <span>View Submitted Attachment / Code</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Score & Feedback Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-brand-navy">
                  Score (Out of {activeSubmission.maxScore})
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={activeSubmission.maxScore}
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  error={gradeError || undefined}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-brand-navy">
                Qualitative Feedback for Learner
              </Label>
              <Textarea
                rows={4}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Share strengths, constructive corrections, and actionable advice..."
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-brand-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSubmission(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="emerald"
                size="sm"
                onClick={handleGradeSubmit}
                disabled={gradeMutation.isPending}
                className="text-xs gap-1.5 font-bold"
              >
                {gradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Record Grade & Feedback</span>
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
