import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — EduVerse',
  description: 'Review the terms governing participation, academic integrity, and certification on EduVerse.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl space-y-10 pb-24">
      {/* Header */}
      <div className="space-y-3 border-b border-brand-border pb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-brand-slate hover:text-brand-emerald mb-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return Home</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-navy">
          Terms of Service & Academic Honor Code
        </h1>
        <p className="text-xs text-brand-slate">
          Last Updated: November 2, 2026 • Effective Date: January 1, 2026
        </p>
      </div>

      {/* Content */}
      <div className="space-y-8 text-sm text-brand-slate leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            1. Acceptance of Terms
          </h2>
          <p>
            By creating an account, accessing courses, or enrolling in educational tracks on EduVerse, you agree to be bound by these Terms of Service. If you are using the platform on behalf of an institution (such as a university or training center), you represent that you possess the authority to bind that entity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            2. Academic Honor Code & Integrity
          </h2>
          <p>
            The value of an EduVerse certificate rests entirely on academic honesty. By enrolling, you pledge:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>To submit only your own authentic work for quizzes, coding assignments, and capstone examinations.</li>
            <li>Not to share examination solutions, automated answer keys, or assessment questions online.</li>
            <li>Not to engage in unauthorized collaboration unless explicitly specified by the course instructor.</li>
            <li>Any confirmed violation will result in immediate certificate revocation and permanent account suspension under our zero-tolerance policy.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            3. Account Governance & Security
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials. You may not share your account or provide access to multiple individuals. If you suspect unauthorized access to your account, you must notify our security team immediately at <code>security@eduverse.et</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            4. Tuition, Domestic Billing & Refunds
          </h2>
          <p>
            Course tuition rates are clearly quoted in Ethiopian Birr (ETB). Payment through Telebirr, CBE Birr, or bank transfer grants immediate access to the selected curriculum. We provide a 7-day satisfaction guarantee for self-paced courses, provided less than 20% of the course modules have been completed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            5. Intellectual Property
          </h2>
          <p>
            All course videos, audio summaries, text transcripts, syllabi, and practice assignments are the proprietary property of EduVerse and its licensed faculty authors. You may not reproduce, redistribute, or commercially exploit any course materials without express written authorization.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            6. Governing Law & Dispute Resolution
          </h2>
          <p>
            These Terms are governed by and construed in accordance with the substantive laws of the Federal Democratic Republic of Ethiopia. Any legal dispute or claim arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in Addis Ababa, Ethiopia.
          </p>
        </section>
      </div>
    </div>
  );
}
