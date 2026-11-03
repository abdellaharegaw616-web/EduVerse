'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  Users,
  BookOpen,
  ArrowLeft,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface InstructorDetails {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  memberSince: string;
  stats: {
    totalCourses: number;
    totalStudents: number;
    averageRating: number;
    reviewCount: number;
  };
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnailUrl?: string | null;
    difficulty: string;
    language: string;
    estimatedHours: number;
    category: string;
    studentCount: number;
    averageRating: number;
  }>;
}

export default function InstructorProfilePage() {
  const params = useParams();
  const instructorId = params?.id as string;

  const { data: instructor, isLoading, isError } = useQuery<InstructorDetails>({
    queryKey: ['marketplace-instructor', instructorId],
    queryFn: async () => {
      return apiClient.request<InstructorDetails>(`/marketplace/instructors/${instructorId}`);
    },
    enabled: !!instructorId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !instructor) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Instructor Not Found</AlertTitle>
          <AlertDescription className="text-xs">
            The requested instructor profile does not exist or has no active published courses.
          </AlertDescription>
        </Alert>
        <Link href="/instructors">
          <Button variant="outline" className="text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Browse Instructors</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-page pb-24">
      {/* Header Profile Section */}
      <section className="bg-brand-navy text-white py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Link
            href="/instructors"
            className="text-xs text-brand-slate hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Instructors</span>
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-brand-emerald text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-lg">
              {instructor.fullName.charAt(0)}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {instructor.fullName}
              </h1>
              <p className="text-xs sm:text-sm text-brand-slate max-w-2xl leading-relaxed">
                {instructor.bio ||
                  'Dedicated faculty member and curriculum author instructing verified courses on the EduVerse platform.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400" />
                  <span>{instructor.stats.averageRating} Rating</span>
                </span>
                <span className="flex items-center gap-1 text-white">
                  <Users className="h-4 w-4 text-brand-emerald" />
                  <span>{instructor.stats.totalStudents} Students</span>
                </span>
                <span className="flex items-center gap-1 text-white">
                  <BookOpen className="h-4 w-4 text-brand-emerald" />
                  <span>{instructor.stats.totalCourses} Published Courses</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Published Courses Section */}
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-10 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Published Courses</h2>
          <p className="text-xs text-brand-slate">
            Explore curriculum designed and instructed by {instructor.fullName}.
          </p>
        </div>

        {instructor.courses.length === 0 ? (
          <div className="p-12 text-center bg-white border border-brand-border rounded-2xl text-xs text-brand-slate">
            This instructor currently has no courses listed in the marketplace.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructor.courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.slug}`} className="group block">
                <Card className="h-full overflow-hidden border border-brand-border bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <Badge className="bg-brand-navy text-white text-[10px]">
                        {course.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {course.difficulty}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-sm text-brand-navy group-hover:text-brand-emerald transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-xs text-brand-slate line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-brand-slate border-t border-brand-border/60">
                      <span className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{course.averageRating}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{course.studentCount}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{course.estimatedHours}h</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
