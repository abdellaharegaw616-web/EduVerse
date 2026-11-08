'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Star,
  Clock,
  Users,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Globe2,
  GraduationCap,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';

interface MarketplaceCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl?: string | null;
  language: string;
  difficulty: string;
  estimatedHours: number;
  status: string;
  category: string;
  categorySlug: string;
  categoryId?: string | null;
  institutionName?: string | null;
  author: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  enrollmentCount: number;
  sectionCount: number;
  reviewCount: number;
  averageRating: number;
  createdAt: string;
}

interface MarketplaceResponse {
  data: MarketplaceCourse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  publishedCourseCount: number;
}

const LANGUAGES = [
  { label: 'All Languages', value: 'all' },
  { label: 'English', value: 'English' },
  { label: 'Amharic', value: 'Amharic' },
  { label: 'Afaan Oromoo', value: 'Afaan Oromoo' },
  { label: 'Tigrinya', value: 'Tigrinya' },
];

const DIFFICULTIES = [
  { label: 'All Levels', value: 'ALL' },
  { label: 'Beginner', value: 'BEGINNER' },
  { label: 'Intermediate', value: 'INTERMEDIATE' },
  { label: 'Advanced', value: 'ADVANCED' },
];

const SORT_OPTIONS = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Highest Rated', value: 'highest_rated' },
  { label: 'Newest Releases', value: 'newest' },
  { label: 'Shortest Duration', value: 'duration_asc' },
  { label: 'Longest Duration', value: 'duration_desc' },
];

export default function MarketplaceCoursesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('ALL');
  const [language, setLanguage] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);

  // 1. Fetch categories
  const { data: categoriesData } = useQuery<CategoryOption[]>({
    queryKey: ['marketplace-categories'],
    queryFn: async () => {
      try {
        return await apiClient.request<CategoryOption[]>('/marketplace/categories');
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch marketplace catalog
  const { data: catalogData, isLoading } = useQuery<MarketplaceResponse>({
    queryKey: ['marketplace-courses', search, category, difficulty, language, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category !== 'all') params.set('category', category);
      if (difficulty !== 'ALL') params.set('difficulty', difficulty);
      if (language !== 'all') params.set('language', language);
      if (sortBy) params.set('sortBy', sortBy);
      params.set('page', page.toString());
      params.set('limit', '12');

      try {
        return await apiClient.request<MarketplaceResponse>(`/marketplace/courses?${params.toString()}`);
      } catch (err) {
        // Return empty structure on temporary network failure
        return {
          data: [],
          meta: { total: 0, page: 1, limit: 12, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        };
      }
    },
  });

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setDifficulty('ALL');
    setLanguage('all');
    setSortBy('popular');
    setPage(1);
  };

  const courses = catalogData?.data || [];
  const meta = catalogData?.meta || { total: 0, page: 1, limit: 12, totalPages: 1 };

  return (
    <div className="min-h-screen bg-brand-page pb-24">
      {/* Hero Header */}
      <section className="bg-slate-900 dark:bg-slate-950 border-b border-slate-800 text-white py-14 px-4 sm:px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10 space-y-6 text-center">
          <Badge className="bg-brand-emerald text-white hover:bg-brand-emerald/90 px-3 py-1 text-xs gap-1.5 inline-flex items-center">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>EduVerse Course Marketplace</span>
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Learn Beyond Boundaries with Industry & Academic Experts
          </h1>
          <p className="text-brand-slate text-sm sm:text-base max-w-2xl mx-auto font-normal">
            Explore verified, peer-reviewed courses accredited by top Ethiopian universities and certified industry practitioners.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md p-1.5 border border-white/20">
              <Search className="h-5 w-5 text-brand-slate ml-3 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by course title, framework, skill, or topic..."
                className="w-full bg-transparent border-0 px-3 py-2 text-white placeholder-brand-slate text-sm focus:outline-none focus:ring-0"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-brand-slate hover:text-white px-2 py-1 mr-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Filter Bar & Results */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 -mt-6">
        {/* Controls Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-4 sm:p-5 space-y-4">
          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
            <button
              onClick={() => {
                setCategory('all');
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                category === 'all'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'bg-slate-100 text-brand-slate hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categoriesData?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.slug);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  category === cat.slug
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'bg-slate-100 text-brand-slate hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Secondary Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-brand-border/60">
            {/* Difficulty Filter */}
            <div>
              <label className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider block mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs rounded-lg border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider block mb-1">
                Instruction Language
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs rounded-lg border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider block mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs rounded-lg border border-brand-border bg-white px-3 py-2 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-emerald"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="w-full text-xs gap-1.5 h-[34px]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between py-6">
          <p className="text-xs text-brand-slate">
            Showing <strong className="text-brand-navy">{courses.length}</strong> of{' '}
            <strong className="text-brand-navy">{meta.total}</strong> published courses
          </p>
        </div>

        {/* Courses Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border border-brand-border bg-white">
                <Skeleton className="h-44 w-full" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="pt-4 flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No matching courses found"
            description="We couldn't find any courses matching your search criteria. Try modifying your search keywords or resetting the filters."
            actionLabel="Reset All Filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="group block"
              >
                <Card className="h-full overflow-hidden border border-brand-border bg-white hover:shadow-lg transition-all duration-300 hover:border-brand-emerald/50 flex flex-col justify-between">
                  <div>
                    {/* Thumbnail Image Container */}
                    <div className="relative h-44 w-full bg-slate-800 dark:bg-slate-900 overflow-hidden">
                      {course.thumbnailUrl ? (
                        <Image
                          src={course.thumbnailUrl}
                          alt={course.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white/90">
                          <GraduationCap className="h-10 w-10 text-brand-emerald mb-2" />
                          <span className="text-xs font-semibold tracking-wide uppercase text-brand-mint">
                            {course.category}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <Badge className="bg-brand-navy/90 text-white backdrop-blur-sm text-[10px] px-2 py-0.5">
                          {course.category}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-white/90 text-brand-navy font-semibold text-[10px] px-2 py-0.5"
                        >
                          {course.difficulty}
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <Badge className="bg-brand-emerald/90 text-white text-[10px] px-2 py-0.5 flex items-center gap-1">
                          <Globe2 className="h-3 w-3" />
                          <span>{course.language}</span>
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5 space-y-3">
                      {/* Author Line */}
                      <div className="flex items-center gap-2 text-xs text-brand-slate">
                        <div className="h-6 w-6 rounded-full bg-brand-navy/10 flex items-center justify-center font-bold text-brand-navy text-[10px] shrink-0">
                          {course.author.fullName.charAt(0)}
                        </div>
                        <span className="truncate">{course.author.fullName}</span>
                        {course.institutionName && (
                          <>
                            <span>•</span>
                            <span className="truncate text-brand-emerald font-medium">
                              {course.institutionName}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Course Title */}
                      <h3 className="font-bold text-base text-brand-navy line-clamp-2 group-hover:text-brand-emerald transition-colors leading-snug">
                        {course.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-brand-slate line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </CardContent>
                  </div>

                  {/* Card Footer Telemetry */}
                  <div className="px-5 py-3 border-t border-brand-border/60 bg-slate-50/50 flex items-center justify-between text-xs text-brand-slate">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{course.averageRating}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{course.enrollmentCount}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{course.estimatedHours}h</span>
                      </span>
                    </div>

                    <span className="text-brand-emerald font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>View</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="pt-10 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
