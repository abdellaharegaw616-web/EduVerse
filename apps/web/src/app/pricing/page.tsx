import React from 'react';
import Link from 'next/link';
import { Check, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Pricing & Plans — EduVerse',
  description: 'Affordable, transparent education pricing with direct Telebirr and CBE payment integration.',
};

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 space-y-16 pb-24">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <Badge variant="secondary" className="bg-brand-mint text-brand-emerald">
          Simple, Local Currency Pricing
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-brand-navy">
          Invest in Your Future with Predictable Rates
        </h1>
        <p className="text-sm sm:text-base text-brand-slate leading-relaxed">
          No foreign exchange credit cards required. Pay directly using Telebirr, CBE Birr, or local bank transfer.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
        {/* Tier 1: Free */}
        <Card className="border-brand-border flex flex-col justify-between">
          <CardHeader className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-slate">Community</span>
            <CardTitle className="text-2xl font-bold text-brand-navy">Free Audit</CardTitle>
            <CardDescription className="text-xs text-brand-slate">
              Essential learning access for independent learners exploring new subjects.
            </CardDescription>
            <div className="pt-4">
              <span className="text-4xl font-extrabold text-brand-navy">0 ETB</span>
              <span className="text-xs text-brand-slate"> / forever</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-xs text-brand-slate pt-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Access to all public lecture videos & transcripts</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Interactive multiple-choice practice quizzes</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Community peer-to-peer discussion forums</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-4 w-4 text-center">—</span>
              <span>No verified digital completion certificates</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-4 w-4 text-center">—</span>
              <span>No instructor code reviews or graded projects</span>
            </div>
          </CardContent>

          <CardFooter className="pt-4">
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full">
                Get Started Free
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Tier 2: Student Pro (Highlighted) */}
        <Card className="border-2 border-brand-emerald bg-white shadow-xl flex flex-col justify-between relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge variant="emerald" className="bg-brand-emerald text-white px-3 py-1 shadow-sm font-semibold">
              Most Popular in Ethiopia
            </Badge>
          </div>

          <CardHeader className="space-y-2 pt-8">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">Student Pro</span>
            <CardTitle className="text-2xl font-bold text-brand-navy">All-Access Pass</CardTitle>
            <CardDescription className="text-xs text-brand-slate">
              Comprehensive career preparation with verified credentials and tutor feedback.
            </CardDescription>
            <div className="pt-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-brand-navy">450 ETB</span>
                <span className="text-xs text-brand-slate"> / month</span>
              </div>
              <span className="text-[11px] text-brand-emerald font-semibold block mt-0.5">
                or 4,200 ETB / year (Save 22%)
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-xs text-brand-slate pt-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Full access to all courses, modules & assignments</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span><strong>Tamper-proof verifiable digital certificate</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Downloadable offline PDFs and audio study notes</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Instructor code grading and assessment feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Priority access to faculty Q&A office hours</span>
            </div>
          </CardContent>

          <CardFooter className="pt-4">
            <Link href="/register" className="w-full">
              <Button variant="emerald" size="lg" className="w-full font-bold shadow-sm">
                Start Pro Membership
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Tier 3: Institution Enterprise */}
        <Card className="border-brand-border flex flex-col justify-between">
          <CardHeader className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-slate">Institutions</span>
            <CardTitle className="text-2xl font-bold text-brand-navy">University & School</CardTitle>
            <CardDescription className="text-xs text-brand-slate">
              Turnkey SaaS infrastructure for universities, colleges, and training institutes.
            </CardDescription>
            <div className="pt-4">
              <span className="text-4xl font-extrabold text-brand-navy">Custom</span>
              <span className="text-xs text-brand-slate"> / institutional billing</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-xs text-brand-slate pt-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Dedicated multi-tenant university portal</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Faculty role management & departmental hierarchies</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Automated exam proctoring & gradebook exports</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Institutional certificates co-signed by University Dean</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brand-emerald shrink-0" />
              <span>Dedicated account manager and technical SLA</span>
            </div>
          </CardContent>

          <CardFooter className="pt-4">
            <Link href="/contact" className="w-full">
              <Button variant="outline" className="w-full">
                Contact Enterprise Sales
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Payment Methods Banner */}
      <div className="rounded-xl border border-brand-border bg-slate-50 p-6 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-brand-emerald shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-brand-navy text-sm">Domestic Ethiopian Payment Options</h4>
            <p className="text-xs text-brand-slate">Supported via Telebirr, CBE Birr, Awash Bank, and Telebirr SuperApp.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-navy">
          <span className="bg-white px-3 py-1.5 rounded border border-brand-border shadow-2xs">telebirr</span>
          <span className="bg-white px-3 py-1.5 rounded border border-brand-border shadow-2xs">CBE Birr</span>
        </div>
      </div>
    </div>
  );
}
