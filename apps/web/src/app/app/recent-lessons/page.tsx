'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { History, PlayCircle, Clock, BookOpen, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface RecentLessonsResponse {
  items: Array<{
    id: string;
    completed: boolean;
    completedAt: string;
    lesson: {
      id: string;
      title: string;
      slug: string;
      durationMinutes: number;
      section: {
        title: string;
        course: {
          id: string;
          title: string;
          slug: string;
          institution?: { name: string };
        };
      };
    };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function RecentLessonsPage() {
  const [page, setPage] = useState(1);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<RecentLessonsResponse>({
    queryKey: ['my-recent-lessons', page],
    queryFn: () =>
      apiClient.get<RecentLessonsResponse>(
        `/enrollments/my/recent-lessons?page=${page}&limit=10`,
      ),
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Study History
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Recently Accessed Lessons
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Chronological audit of lessons, lectures, and interactive modules you have engaged with.
          </p>
        </div>

        <Link href="/app/courses">
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span>My Courses</span>
          </Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Retrieve Lesson History</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'A network error occurred.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-border bg-white divide-y divide-brand-border">
            {data.items.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-mint text-brand-emerald shrink-0 mt-0.5">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-brand-emerald block">
                      {item.lesson.section.course.title} • {item.lesson.section.title}
                    </span>
                    <h3 className="font-bold text-brand-navy text-sm leading-snug">
                      {item.lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-brand-slate">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.lesson.durationMinutes} min
                      </span>
                      <span>•</span>
                      <span>Accessed: {new Date(item.completedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <Badge variant="emerald" className="text-[10px]">Completed</Badge>
                  <Link href={`/courses/${item.lesson.section.course.slug}/learn?lesson=${item.lesson.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <span>Review</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="No Recent Activity Found"
          description="You have not started any course lessons yet. Resume an enrolled course to begin."
          actionHref="/app/courses"
          actionLabel="Go to My Courses"
        />
      )}
    </div>
  );
}

