import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  WifiOff,
  Building2,
  ShieldCheck,
  CreditCard,
  Star,
  Users,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PreviewBadge } from '@/components/shared/preview-badge';

const FEATURED_COURSES = [
  {
    slug: 'full-stack-web-dev-nextjs-nestjs',
    title: 'Full-Stack Web Development with Next.js & NestJS',
    instructor: 'Dr. Abebe Kebede',
    institution: 'Addis Ababa Institute of Technology (AAiT)',
    category: 'Computer Science & Tech',
    level: 'Intermediate',
    duration: '24 Hours',
    rating: 5.0,
    enrolledCount: 4,
    price: 1800,
    thumbnailBg: 'from-blue-600 to-indigo-900',
  },
  {
    slug: 'intro-machine-learning-python',
    title: 'Introduction to Machine Learning & Data Science in Python',
    instructor: 'Dr. Abebe Kebede',
    institution: 'Addis Ababa Institute of Technology (AAiT)',
    category: 'Computer Science & Tech',
    level: 'Beginner',
    duration: '18 Hours',
    rating: 4.9,
    enrolledCount: 4,
    price: 2200,
    thumbnailBg: 'from-emerald-600 to-teal-900',
  },
  {
    slug: 'microservices-docker-kubernetes',
    title: 'Advanced Microservices Architecture with Docker & Kubernetes',
    instructor: 'Dr. Abebe Kebede',
    institution: 'Addis Ababa Institute of Technology (AAiT)',
    category: 'Engineering & Robotics',
    level: 'Advanced',
    duration: '30 Hours',
    rating: 4.8,
    enrolledCount: 1,
    price: 2500,
    thumbnailBg: 'from-purple-600 to-slate-900',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 lg:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-mint/40 via-brand-page to-brand-page pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-emerald/30 bg-white px-3 py-1 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-brand-emerald animate-pulse" />
              <span className="text-xs font-semibold text-brand-emerald">
                Ethiopia's Modern Higher & Vocational Learning Platform
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-navy leading-tight">
              Learn Beyond Boundaries, <br className="hidden sm:inline" />
              <span className="text-brand-emerald">Anywhere in Ethiopia.</span>
            </h1>

            <p className="text-base sm:text-lg text-brand-slate leading-relaxed max-w-2xl mx-auto">
              EduVerse connects ambitious students with leading university professors, structured curricula, and verifiable certificates — engineered to run reliably even on low-bandwidth 3G connections.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/courses">
                <Button variant="emerald" size="lg" className="gap-2 shadow-sm">
                  <span>Explore Catalog</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg" className="border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white">
                  Create Student Account
                </Button>
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 border-t border-brand-border/80">
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-brand-navy">15,000+</div>
                <div className="text-xs text-brand-slate font-medium mt-1">Active Students</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-brand-emerald">42+</div>
                <div className="text-xs text-brand-slate font-medium mt-1">Institutional Partners</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-brand-navy">98%</div>
                <div className="text-xs text-brand-slate font-medium mt-1">3G Completion Rate</div>
              </div>
              <div className="p-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">100%</div>
                <div className="text-xs text-brand-slate font-medium mt-1">Verifiable Credentials</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ETHIOPIAN EDUCATIONAL CHALLENGES SOLVED */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Architected for Purpose
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-navy">
            Engineered to Solve Real Ethiopian Realities
          </h2>
          <p className="text-sm text-brand-slate">
            Global platforms fail under high latency, unpredictable data costs, and foreign currency barriers. EduVerse is built from the ground up to solve these constraints.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-brand-border hover:border-brand-emerald/40 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-brand-emerald">
                <WifiOff className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-brand-navy text-base">Low-Bandwidth Optimized</h3>
              <p className="text-xs text-brand-slate leading-relaxed">
                Aggressive asset compression, offline text notes, and adaptive 360p streaming engineered to perform smoothly on intermittent 3G ethio telecom cellular connections.
              </p>
            </CardContent>
          </Card>

          <Card className="border-brand-border hover:border-brand-emerald/40 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-brand-navy text-base">Local Birr Payments</h3>
              <p className="text-xs text-brand-slate leading-relaxed">
                Eliminates foreign credit card dependency. Direct checkout support designed for Telebirr, CBE Birr, and Awash Bank domestic transfers.
              </p>
            </CardContent>
          </Card>

          <Card className="border-brand-border hover:border-brand-emerald/40 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-brand-navy text-base">Institutional Multi-Tenancy</h3>
              <p className="text-xs text-brand-slate leading-relaxed">
                Dedicated branded sub-tenants for Ethiopian universities. Department heads manage faculty rosters, student cohorts, and exam moderation under one roof.
              </p>
            </CardContent>
          </Card>

          <Card className="border-brand-border hover:border-brand-emerald/40 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-brand-navy text-base">Verifiable Certificates</h3>
              <p className="text-xs text-brand-slate leading-relaxed">
                Graduates receive cryptographically signed digital certificates with unique verification codes that employers and institutions can validate instantly online.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. FEATURED COURSES SECTION */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
                Featured Programs
              </span>
              <PreviewBadge />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-navy mt-1">
              Top Academic & Professional Courses
            </h2>
          </div>
          <Link href="/courses">
            <Button variant="outline" size="sm" className="gap-1.5 self-start">
              <span>View Full Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_COURSES.map((course) => (
            <Card key={course.slug} className="overflow-hidden flex flex-col justify-between border-brand-border hover:shadow-lg transition-shadow">
              <div>
                <div className={`h-40 bg-gradient-to-br ${course.thumbnailBg} p-5 flex flex-col justify-between text-white relative`}>
                  <Badge variant="secondary" className="self-start bg-white/20 text-white backdrop-blur-sm border-white/30">
                    {course.category}
                  </Badge>
                  <div>
                    <span className="text-xs text-white/80 font-medium">{course.institution}</span>
                    <h4 className="font-bold text-white text-base line-clamp-2 mt-0.5">{course.title}</h4>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-brand-slate">
                    <span className="font-medium text-brand-navy">{course.instructor}</span>
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      {course.rating}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-brand-slate pt-2 border-t border-brand-border">
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
                  <span className="text-base font-bold text-brand-navy">{course.price.toLocaleString()} ETB</span>
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
      </section>

      {/* 4. INSTITUTIONAL TRUST & PARTNERSHIP */}
      <section className="bg-white border-y border-brand-border py-12">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
            Trusted by Departments & Faculty Across Ethiopia
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-80 grayscale hover:grayscale-0 transition-all">
            <span className="font-bold text-base text-brand-navy flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-emerald" />
              Addis Ababa University
            </span>
            <span className="font-bold text-base text-brand-navy flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-emerald" />
              ASTU (Adama)
            </span>
            <span className="font-bold text-base text-brand-navy flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-emerald" />
              Hawassa University
            </span>
            <span className="font-bold text-base text-brand-navy flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-emerald" />
              Jimma University
            </span>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="rounded-2xl bg-brand-navy text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-brand-emerald/10 blur-3xl pointer-events-none" />
          <div className="max-w-2xl space-y-5">
            <Badge variant="secondary" className="bg-brand-emerald/20 text-brand-mint border-brand-emerald/30">
              Start Learning Now
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Ready to Advance Your Skills with Verifiable Education?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Join thousands of Ethiopian students advancing their careers in Software Engineering, Data Science, Electrical Engineering, and Business Management.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/register">
                <Button variant="emerald" size="lg" className="gap-2 font-semibold">
                  <span>Create Free Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-brand-navy">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
