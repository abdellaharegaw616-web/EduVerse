import React from 'react';
import Link from 'next/link';
import { Target, ShieldCheck, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'About Us — EduVerse',
  description:
    'Learn about EduVerse mission, leadership, and our commitment to democratizing quality higher education throughout Ethiopia.',
};

export default function AboutPage() {
  return (
    <div className="space-y-16 lg:space-y-24 py-12 pb-20">
      {/* 1. HERO */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Badge variant="secondary" className="bg-brand-mint text-brand-emerald">
            Our Purpose & Vision
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-brand-navy">
            Building Ethiopia’s Premier Learning Infrastructure
          </h1>
          <p className="text-base sm:text-lg text-brand-slate leading-relaxed">
            EduVerse was founded to remove systemic barriers to structured higher and vocational education — bridging geographic isolation, unstable connectivity, and foreign exchange hurdles.
          </p>
        </div>
      </section>

      {/* 2. THE STORY / CONTEXT */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
              The Ethiopian Reality
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
              Why Traditional E-Learning Failed in Ethiopia
            </h2>
            <p className="text-sm text-brand-slate leading-relaxed">
              Western online education platforms assume ubiquitous fiber broadband, USD credit cards, and continuous high-speed video streaming. In Ethiopia, students frequently contend with 3G mobile data packages, periodic connectivity interruptions, and lack of international payment options.
            </p>
            <p className="text-sm text-brand-slate leading-relaxed">
              EduVerse replaces heavy 4K video dependency with structured hybrid coursework: lightweight audio summaries, offline-cacheable reading modules, synchronized markdown lessons, and low-bitrate adaptive streams.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-lg border border-brand-border p-4 bg-white">
                <div className="text-2xl font-bold text-brand-emerald">&lt; 5 MB</div>
                <div className="text-xs text-brand-slate mt-1">Average lesson bandwidth cost</div>
              </div>
              <div className="rounded-lg border border-brand-border p-4 bg-white">
                <div className="text-2xl font-bold text-brand-navy">0 USD</div>
                <div className="text-xs text-brand-slate mt-1">100% domestic Birr checkout</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-navy via-slate-900 to-brand-navy p-8 text-white space-y-6 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-emerald text-white">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Our Triad Mission</h3>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Deliver university-grade knowledge to every region of Ethiopia, from Addis Ababa to rural vocational centers.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Academic Integrity:</strong> Partner with tenured faculty and accredited institutions to safeguard educational rigor.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Verifiable Outcomes:</strong> Provide graduates with cryptographically tamper-proof certificates that employers can audit in seconds.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES */}
      <section className="bg-white border-y border-brand-border py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
              Core Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
              What Drives Our Engineering
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-brand-border">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-brand-emerald">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-brand-navy text-base">Pragmatic Engineering</h3>
                <p className="text-xs text-brand-slate leading-relaxed">
                  We don’t build for ideal conditions; we build for real networks. Every screen, payload, and query is profiled for maximum speed and minimal payload weight.
                </p>
              </CardContent>
            </Card>

            <Card className="border-brand-border">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-brand-navy text-base">Trust & Cryptography</h3>
                <p className="text-xs text-brand-slate leading-relaxed">
                  Certificate fraud harms genuine graduates. Every credential issued by EduVerse carries an immutable SHA-256 hash and verifiable public landing record.
                </p>
              </CardContent>
            </Card>

            <Card className="border-brand-border">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-brand-navy text-base">Teacher Empowerment</h3>
                <p className="text-xs text-brand-slate leading-relaxed">
                  Educators deserve intuitive curriculum builders, automated quiz evaluations, and transparent revenue share without administrative friction.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION */}
      <section className="container mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Be Part of Ethiopia's Educational Revolution
          </h2>
          <p className="text-sm text-brand-slate">
            Whether you are a student seeking practical engineering skills, an instructor wanting to reach thousands, or an institution seeking digital transformation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/courses">
              <Button variant="emerald">Browse Courses</Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline">Contact Our Team</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
