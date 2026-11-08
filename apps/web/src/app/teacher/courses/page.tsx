'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Search,
  PlusCircle,
  Users,
  Layers,
  Edit,
  Trash2,
  AlertCircle,
  BarChart2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  categoryName: string;
  studentCount: number;
  sectionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TeacherCoursesResponse {
  items: CourseItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function TeacherCoursesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);

  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TeacherCoursesResponse>({
    queryKey: ['teacher-courses', statusFilter, searchTerm, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('page', page.toString());
      params.set('limit', '8');
      return apiClient.get<TeacherCoursesResponse>(`/courses/teacher/my?${params.toString()}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => apiClient.delete(`/courses/teacher/${courseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      setCourseToDelete(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="emerald">Published</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">Pending Review</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700">Draft</Badge>;
      case 'ARCHIVED':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Curriculum Studio
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Authored Courses & Curriculums
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Create, edit, organize lesson modules, and publish courseware across university networks.
          </p>
        </div>

        <Link href="/teacher/courses/create">
          <Button variant="emerald" size="sm" className="gap-2 text-xs font-semibold shadow-xs">
            <PlusCircle className="h-4 w-4" />
            <span>Create New Course</span>
          </Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Courses Retrieval Failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to retrieve teacher course directory.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Courses' },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Drafts' },
            { id: 'pending_review', label: 'Pending Review' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-brand-navy text-white shadow-xs'
                  : 'bg-white border border-brand-border text-brand-slate hover:text-brand-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-slate" />
          <Input
            placeholder="Search authored courses..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items.map((course) => (
            <Card
              key={course.id}
              className="border border-brand-border bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold text-brand-emerald">
                      {course.categoryName}
                    </span>
                    {getStatusBadge(course.status)}
                  </div>

                  <h3 className="font-bold text-base text-brand-navy line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-brand-slate line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-brand-slate pt-2 border-t border-brand-border/60">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-brand-slate/80" />
                    {course.sectionCount} Sections
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-brand-slate/80" />
                    {course.studentCount} Students
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 gap-2 border-t border-brand-border/60">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/teacher/courses/${course.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                    </Link>
                    <Link href={`/teacher/courses/${course.id}/sections`}>
                      <Button variant="default" size="sm" className="h-7 text-xs gap-1">
                        <Layers className="h-3 w-3" />
                        <span>Curriculum</span>
                      </Button>
                    </Link>
                    <Link href={`/teacher/courses/${course.id}/students`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Users className="h-3 w-3" />
                        <span>Students</span>
                      </Button>
                    </Link>
                    <Link href={`/teacher/courses/${course.id}/analytics`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs p-1.5" title="Analytics">
                        <BarChart2 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCourseToDelete(course)}
                    className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    title="Delete Course"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No Matching Courses"
          description={
            searchTerm
              ? `No courses matched your search query "${searchTerm}".`
              : 'You have not created any courses in this status tab.'
          }
          actionHref="/teacher/courses/create"
          actionLabel="Create Course"
        />
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Destructive Action Confirmation Modal */}
      <Dialog
        open={Boolean(courseToDelete)}
        onOpenChange={(open) => !open && setCourseToDelete(null)}
      >
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            <span>Confirm Course Deletion</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{courseToDelete?.title}</strong>? This action will permanently
            delete all associated curriculum sections, lesson resources, quizzes, and assignment prompts.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCourseToDelete(null)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => courseToDelete && deleteMutation.mutate(courseToDelete.id)}
            disabled={deleteMutation.isPending}
            className="gap-1.5"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
