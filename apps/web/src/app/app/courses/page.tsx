'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search, ArrowRight, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface EnrollmentListResponse {
  items: Array<{
    id: string;
    progressPercentage: number;
    enrolledAt: string;
    completedAt: string | null;
    course: {
      id: string;
      title: string;
      slug: string;
      author: { fullName: string };
      institution?: { name: string; slug: string };
      category?: { name: string };
      sections: Array<{
        lessons: Array<{ id: string; durationMinutes: number }>;
      }>;
    };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function MyCoursesPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EnrollmentListResponse>({
    queryKey: ['my-enrollments', statusFilter, page],
    queryFn: () =>
      apiClient.get<EnrollmentListResponse>(
        `/enrollments/my?status=${statusFilter}&page=${page}&limit=8`,
      ),
  });

  const filteredItems = (data?.items || []).filter((item) =>
    item.course.title.toLowerCase().includes(search.toLowerCase()) ||
    item.course.author.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Academic Portfolio
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            My Enrolled Courses
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Manage your enrolled degree tracks, vocational programs, and completion standings.
          </p>
        </div>

        <Link href="/courses">
          <Button variant="emerald" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Enroll in New Course</span>
          </Button>
        </Link>
      </div>

      {/* Controls: Search and Status Filters */}
      <div className="rounded-xl border border-brand-border bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-slate" />
          <Input
            placeholder="Search enrolled courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-brand-border text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'in-progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-brand-navy text-white'
                  : 'bg-slate-100 text-brand-slate hover:bg-slate-200'
              }`}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Load Enrolled Courses</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Unable to retrieve course list.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((enrollment) => (
              <Card
                key={enrollment.id}
                className="border-brand-border flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      {enrollment.course.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {enrollment.course.category.name}
                        </Badge>
                      )}
                      <span className="font-extrabold text-brand-emerald">
                        {Math.round(enrollment.progressPercentage)}%
                      </span>
                    </div>

                    <h3 className="font-bold text-brand-navy text-sm line-clamp-2">
                      {enrollment.course.title}
                    </h3>
                    <p className="text-xs text-brand-slate">{enrollment.course.author.fullName}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-emerald h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, enrollment.progressPercentage))}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-brand-slate pt-2 border-t border-brand-border flex items-center justify-between">
                    <span>
                      Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </span>
                    {enrollment.completedAt ? (
                      <span className="text-emerald-700 font-bold">Completed</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">In Progress</span>
                    )}
                  </div>
                </CardContent>

                <div className="p-5 pt-0">
                  <Link href={`/courses/${enrollment.course.slug}`} className="w-full block">
                    <Button variant="emerald" size="sm" className="w-full gap-1.5 text-xs">
                      <span>Resume Study</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={data?.pagination.page || 1}
            totalPages={data?.pagination.totalPages || 1}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No Courses Found"
          description={
            search
              ? 'No enrolled courses matched your search query.'
              : 'You have not enrolled in any courses in this category.'
          }
          actionHref="/courses"
          actionLabel="Browse Catalog"
        />
      )}
    </div>
  );
}

