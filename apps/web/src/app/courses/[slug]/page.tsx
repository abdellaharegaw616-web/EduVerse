import React from 'react';
import Link from 'next/link';
import {
  Clock,
  Users,
  Star,
  CheckCircle2,
  PlayCircle,
  Download,
  ShieldCheck,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PreviewBadge } from '@/components/shared/preview-badge';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `Course Details — ${slug} | EduVerse`,
    description: 'Explore syllabus, prerequisites, instructor bio, and tuition details on EduVerse.',
  };
}

const SAMPLE_MODULES = [
  {
    title: 'Module 1: Foundations of Distributed TypeScript & Architecture',
    duration: '2 Weeks (8 Lessons)',
    lessons: [
      { title: 'Monorepo Architecture & Package Management (pnpm)', duration: '25 min', type: 'video' },
      { title: 'Strict TypeScript Types, Generics & Domain Contracts', duration: '40 min', type: 'reading' },
      { title: 'Environment Validation & Micro-service Contracts', duration: '30 min', type: 'video' },
      { title: 'Hands-on Assignment: Architecting Clean Types', duration: '1 hour', type: 'assignment' },
    ],
  },
  {
    title: 'Module 2: Relational Databases & PostgreSQL Optimization',
    duration: '3 Weeks (12 Lessons)',
    lessons: [
      { title: 'PostgreSQL Schema Modeling & Normalization', duration: '45 min', type: 'video' },
      { title: 'Prisma ORM: Transactions, Indexes & Constraints', duration: '50 min', type: 'video' },
      { title: 'Low-Bandwidth Pagination & Query Profiling', duration: '35 min', type: 'reading' },
      { title: 'Quiz: Multi-Tenant Schema Security', duration: '20 min', type: 'quiz' },
    ],
  },
  {
    title: 'Module 3: Production Backend Engineering with NestJS',
    duration: '4 Weeks (16 Lessons)',
    lessons: [
      { title: 'NestJS Dependency Injection & Modular Architecture', duration: '45 min', type: 'video' },
      { title: 'Argon2id Authentication & Rotating Refresh Tokens', duration: '60 min', type: 'video' },
      { title: 'Role-Based Access Control (RBAC) & TenantGuards', duration: '40 min', type: 'reading' },
      { title: 'End-to-End Jest Testing & CI Automation', duration: '55 min', type: 'assignment' },
    ],
  },
];

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 space-y-10 pb-24">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-brand-slate">
        <Link href="/" className="hover:text-brand-emerald">Home</Link>
        <span>/</span>
        <Link href="/courses" className="hover:text-brand-emerald">Courses</Link>
        <span>/</span>
        <span className="text-brand-navy font-semibold truncate max-w-xs">{slug}</span>
      </nav>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Columns: Course Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-brand-mint text-brand-emerald">
                Computer Science & Engineering
              </Badge>
              <PreviewBadge label="Course Detail Preview" phase="Phase 7B Engine" />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy">
              Modern Full-Stack Web Development in TypeScript
            </h1>

            <p className="text-sm sm:text-base text-brand-slate leading-relaxed">
              Build production-grade distributed applications using Next.js App Router, React 19, NestJS, and PostgreSQL. Master multi-tenant database modeling, secure JWT authentication with Argon2id, and high-performance REST APIs.
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs text-brand-slate pt-2 border-y border-brand-border py-3">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-brand-navy">4.9</span>
                <span>(340 reviews)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-emerald" />
                <span>1,420 Enrolled Students</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand-emerald" />
                <span>12 Weeks Duration</span>
              </div>
            </div>
          </div>

          {/* What You Will Learn */}
          <div className="rounded-xl border border-brand-border bg-white p-6 space-y-4">
            <h3 className="text-lg font-bold text-brand-navy">What You Will Learn</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-brand-slate">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
                <span>Architect scalable monorepos with pnpm and shared TypeScript types.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
                <span>Design multi-tenant PostgreSQL schemas with Prisma ORM.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
                <span>Implement enterprise RBAC authorization and audit logging.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
                <span>Optimize frontend loads for low-bandwidth 3G mobile devices.</span>
              </div>
            </div>
          </div>

          {/* Syllabus / Modules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-brand-navy">Curriculum Syllabus</h3>
              <span className="text-xs text-brand-slate font-medium">3 Modules • 36 Lessons • 4 Projects</span>
            </div>

            <div className="space-y-3">
              {SAMPLE_MODULES.map((module, idx) => (
                <div key={idx} className="rounded-lg border border-brand-border bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-brand-navy">{module.title}</h4>
                    <span className="text-xs text-brand-slate">{module.duration}</span>
                  </div>
                  <ul className="space-y-2 pt-2 border-t border-brand-border">
                    {module.lessons.map((lesson, lIdx) => (
                      <li key={lIdx} className="flex items-center justify-between text-xs text-brand-slate hover:text-brand-navy py-1">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="h-3.5 w-3.5 text-brand-emerald" />
                          <span>{lesson.title}</span>
                        </div>
                        <span>{lesson.duration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Instructor Bio */}
          <div className="rounded-xl border border-brand-border bg-white p-6 space-y-4">
            <h3 className="text-lg font-bold text-brand-navy">Course Faculty</h3>
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-brand-navy text-white flex items-center justify-center text-lg font-bold shrink-0">
                AB
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-brand-navy text-base">Dr. Abebe Bekele</h4>
                <p className="text-xs text-brand-emerald font-semibold">Associate Professor of Computer Science, AAU</p>
                <p className="text-xs text-brand-slate leading-relaxed pt-1">
                  Over 15 years of software engineering instruction and distributed systems research. Former consultant to the Ethiopian Ministry of Innovation and Technology.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Sticky Enrollment Card */}
        <div className="space-y-6">
          <Card className="sticky top-20 border-brand-border shadow-md">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <span className="text-xs text-brand-slate uppercase tracking-wider font-semibold">Tuition</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-brand-navy">1,800 ETB</span>
                  <span className="text-xs text-brand-slate line-through">3,200 ETB</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  Subsidized Institutional Rate
                </span>
              </div>

              <div className="space-y-3">
                <Link href="/register" className="w-full block">
                  <Button variant="emerald" size="lg" className="w-full gap-2 font-bold shadow-sm">
                    <span>Enroll in Course</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-[11px] text-center text-brand-slate">
                  Zero foreign exchange fees. Direct Telebirr and CBE payment available.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-brand-border text-xs text-brand-slate">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-emerald shrink-0" />
                  <span>Accredited Certificate upon completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-brand-emerald shrink-0" />
                  <span>Downloadable offline study notes</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-brand-emerald shrink-0" />
                  <span>Lifetime access to course exercises</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
