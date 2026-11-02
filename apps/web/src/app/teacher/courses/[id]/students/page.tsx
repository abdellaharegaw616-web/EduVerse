'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  HelpCircle,
  PlayCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface StudentEnrollmentItem {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  avatarUrl?: string | null;
  progressPercentage: number;
  completedAt?: string | null;
  enrolledAt: string;
  quizzesAttempted: number;
  assignmentsSubmitted: number;
  lessonsCompleted: number;
}

export default function CourseStudentsPage() {
  const params = useParams();
  const courseId = params?.id as string;
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: students,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<StudentEnrollmentItem[]>({
    queryKey: ['teacher-course-students', courseId],
    queryFn: () => apiClient.get<StudentEnrollmentItem[]>(`/courses/teacher/${courseId}/students`),
    enabled: Boolean(courseId),
  });

  const filteredStudents = (students || []).filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <Link
            href={`/teacher/courses/${courseId}/edit`}
            className="text-xs font-semibold text-brand-slate hover:text-brand-navy flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Course Settings</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Enrolled Student Directory
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Monitor real-time learner progression, quiz participation, and module completion milestones.
          </p>
        </div>

        <Link href={`/teacher/courses/${courseId}/analytics`}>
          <Button variant="outline" size="sm">
            Course Analytics
          </Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Fetch Student Records</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to retrieve enrolled student roster.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-slate" />
          <Input
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <span className="text-xs text-brand-slate whitespace-nowrap">
          Total Enrolled: <strong className="text-brand-navy">{students?.length || 0}</strong>
        </span>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="rounded-xl border border-brand-border bg-white divide-y divide-brand-border overflow-hidden shadow-xs">
          {filteredStudents.map((item) => (
            <div
              key={item.enrollmentId}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-brand-navy text-brand-mint font-bold flex items-center justify-center shrink-0 text-xs">
                  {item.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-brand-navy">{item.studentName}</h4>
                  <p className="text-[11px] text-brand-slate">{item.studentEmail}</p>
                  <span className="text-[10px] text-brand-slate/80 block mt-0.5">
                    Enrolled: {new Date(item.enrolledAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Progress & Activities */}
              <div className="flex items-center gap-6">
                <div className="space-y-1 w-36">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-brand-slate font-medium">Progress</span>
                    <span className="font-bold text-brand-navy">{item.progressPercentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-brand-emerald rounded-full"
                      style={{ width: `${item.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-3 text-[11px] text-brand-slate">
                  <span className="flex items-center gap-1" title="Lessons Completed">
                    <PlayCircle className="h-3.5 w-3.5 text-blue-500" />
                    {item.lessonsCompleted}
                  </span>
                  <span className="flex items-center gap-1" title="Quizzes Taken">
                    <HelpCircle className="h-3.5 w-3.5 text-purple-500" />
                    {item.quizzesAttempted}
                  </span>
                  <span className="flex items-center gap-1" title="Assignments Submitted">
                    <FileCheck2 className="h-3.5 w-3.5 text-amber-500" />
                    {item.assignmentsSubmitted}
                  </span>
                </div>

                <div>
                  {item.completedAt ? (
                    <Badge variant="emerald" className="gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      In Progress
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No Students Found"
          description={
            searchTerm
              ? `No student matched "${searchTerm}".`
              : 'Zero students are currently enrolled in this course.'
          }
        />
      )}
    </div>
  );
}
