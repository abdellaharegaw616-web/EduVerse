'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Star, Clock, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PreviewBadge } from '@/components/shared/preview-badge';

const COURSES_DATA = [
  {
    slug: 'fullstack-web-engineering',
    title: 'Modern Full-Stack Web Development in TypeScript',
    description: 'Master React, Next.js, NestJS, and PostgreSQL for production-scale distributed web applications.',
    instructor: 'Dr. Abebe Bekele',
    institution: 'Addis Ababa University',
    category: 'Computer Science',
    level: 'Intermediate',
    duration: '12 Weeks',
    rating: 4.9,
    enrolledCount: 1420,
    price: 1800,
    thumbnailBg: 'from-blue-600 to-indigo-900',
  },
  {
    slug: 'python-data-science-ai',
    title: 'Applied Data Science & Machine Learning for East Africa',
    description: 'Statistical analysis, pandas, Scikit-learn, and neural networks tuned for regional agricultural and financial datasets.',
    instructor: 'Sara Tadesse, M.Sc.',
    institution: 'EthioAI Research Institute',
    category: 'Computer Science',
    level: 'Beginner',
    duration: '10 Weeks',
    rating: 4.8,
    enrolledCount: 980,
    price: 2200,
    thumbnailBg: 'from-emerald-600 to-teal-900',
  },
  {
    slug: 'cloud-devops-microservices',
    title: 'Cloud Infrastructure & DevOps with Docker & Kubernetes',
    description: 'Learn container orchestration, CI/CD automated deployment pipelines, and scalable Linux microservice architectures.',
    instructor: 'Dawit Yohannes',
    institution: 'Independent Cloud Architect',
    category: 'Engineering',
    level: 'Advanced',
    duration: '8 Weeks',
    rating: 4.9,
    enrolledCount: 750,
    price: 2500,
    thumbnailBg: 'from-purple-600 to-slate-900',
  },
  {
    slug: 'financial-accounting-ethiopia',
    title: 'Financial Accounting & Tax Law in Ethiopia',
    description: 'Comprehensive coverage of Ministry of Revenue regulations, VAT compliance, IFRS standards, and ledger bookkeeping.',
    instructor: 'Almaz Mengistu, CPA',
    institution: 'School of Commerce, AAU',
    category: 'Business',
    level: 'Beginner',
    duration: '6 Weeks',
    rating: 4.7,
    enrolledCount: 1100,
    price: 1500,
    thumbnailBg: 'from-amber-600 to-orange-900',
  },
  {
    slug: 'embedded-systems-iot',
    title: 'Embedded Systems & IoT Hardware Engineering',
    description: 'Hands-on microcontrollers, ESP32, sensors, and firmware development for agricultural monitoring systems.',
    instructor: 'Eng. Solomon Worku',
    institution: 'ASTU (Adama)',
    category: 'Engineering',
    level: 'Intermediate',
    duration: '10 Weeks',
    rating: 4.8,
    enrolledCount: 620,
    price: 2100,
    thumbnailBg: 'from-cyan-600 to-blue-900',
  },
  {
    slug: 'public-health-epidemiology',
    title: 'Epidemiological Surveillance & Public Health Leadership',
    description: 'Modern disease surveillance, biostatistics, community health interventions, and pandemic preparedness.',
    instructor: 'Dr. Yared Fikre, MD',
    institution: 'Hawassa University College of Medicine',
    category: 'Healthcare',
    level: 'Intermediate',
    duration: '8 Weeks',
    rating: 4.9,
    enrolledCount: 840,
    price: 1900,
    thumbnailBg: 'from-rose-600 to-red-900',
  },
];

const CATEGORIES = ['All', 'Computer Science', 'Engineering', 'Business', 'Healthcare'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');

  const filteredCourses = COURSES_DATA.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.description.toLowerCase().includes(search.toLowerCase()) ||
      course.instructor.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || course.category === selectedCategory;

    const matchesLevel =
      selectedLevel === 'All' || course.level === selectedLevel;

    return matchesSearch && matchesCategory && matchesLevel;
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Course Marketplace
          </span>
          <PreviewBadge label="Catalog Preview" phase="Phase 7B Engine" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-navy">
          Explore Accredited Courses & Bootcamps
        </h1>
        <p className="text-sm text-brand-slate max-w-2xl">
          Discover programs crafted by top Ethiopian professors and industry experts, optimized for low-bandwidth study with verifiable certification.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-xl border border-brand-border bg-white p-4 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-brand-slate" />
          <Input
            placeholder="Search by course title, topic, or instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-brand-border"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-brand-border">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-brand-slate mr-1">Discipline:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-emerald text-white'
                    : 'bg-slate-100 text-brand-slate hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Level Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-brand-slate mr-1">Level:</span>
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-brand-navy text-white'
                    : 'bg-slate-100 text-brand-slate hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.slug}
              className="overflow-hidden flex flex-col justify-between border-brand-border hover:shadow-lg transition-shadow"
            >
              <div>
                <div
                  className={`h-40 bg-gradient-to-br ${course.thumbnailBg} p-5 flex flex-col justify-between text-white relative`}
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white backdrop-blur-sm border-white/30"
                    >
                      {course.category}
                    </Badge>
                    <span className="text-[11px] font-semibold bg-brand-navy/60 px-2 py-0.5 rounded text-white">
                      {course.level}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-white/80 font-medium">
                      {course.institution}
                    </span>
                    <h3 className="font-bold text-white text-base line-clamp-2 mt-0.5">
                      {course.title}
                    </h3>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <p className="text-xs text-brand-slate line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-brand-slate pt-2 border-t border-brand-border">
                    <span className="font-medium text-brand-navy">
                      {course.instructor}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      {course.rating}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-brand-slate pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-brand-emerald" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand-emerald" />
                      <span>{course.enrolledCount} enrolled</span>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-5 pt-0 border-t border-brand-border flex items-center justify-between mt-2">
                <div>
                  <span className="text-[11px] text-brand-slate block">Tuition</span>
                  <span className="text-base font-bold text-brand-navy">
                    {course.price.toLocaleString()} ETB
                  </span>
                </div>
                <Link href={`/courses/${course.slug}`}>
                  <Button variant="emerald" size="sm">
                    View Course
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-brand-border bg-white p-12 text-center space-y-4">
          <BookOpen className="h-10 w-10 text-brand-slate mx-auto" />
          <h3 className="text-lg font-bold text-brand-navy">No courses matched your query</h3>
          <p className="text-sm text-brand-slate max-w-sm mx-auto">
            Try adjusting your search keywords or resetting the category and difficulty level filters.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              setSelectedCategory('All');
              setSelectedLevel('All');
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
