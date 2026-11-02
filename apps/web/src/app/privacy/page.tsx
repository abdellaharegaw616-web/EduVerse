import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — EduVerse',
  description: 'Understand how EduVerse collects, protects, and handles your educational and personal data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl space-y-10 pb-24">
      {/* Header */}
      <div className="space-y-3 border-b border-brand-border pb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-brand-slate hover:text-brand-emerald mb-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return Home</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-navy">
          EduVerse Privacy Policy
        </h1>
        <p className="text-xs text-brand-slate">
          Last Updated: November 2, 2026 • Effective Date: January 1, 2026
        </p>
      </div>

      {/* Content */}
      <div className="space-y-8 text-sm text-brand-slate leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-emerald" />
            1. Commitment to Student Privacy & Educational Integrity
          </h2>
          <p>
            EduVerse (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates an educational SaaS platform designed for Ethiopian learners, educators, and partner universities. We hold user trust and confidentiality to the highest standard. We do not sell your personal data or browsing telemetry to third-party advertising networks.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            2. Information We Collect
          </h2>
          <p>
            When registering and using the platform, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong>Account Identity:</strong> Full name, verified email address, chosen password (stored as a one-way Argon2id hash), and institutional affiliation if enrolling through a partner university.</li>
            <li><strong>Academic Progress:</strong> Lesson completion records, quiz scores, assignment submissions, code sandbox outputs, and issued certificates.</li>
            <li><strong>Technical & Session Telemetry:</strong> Anonymized client headers, device type, connection bandwidth profiles, and security audit logs to safeguard multi-tenant isolation.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            3. How We Utilize Your Data
          </h2>
          <p>Your information is utilized solely to:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>Deliver responsive learning content optimized for your cellular or broadband connection.</li>
            <li>Issue cryptographically verifiable graduation certificates with unique SHA-256 hashes.</li>
            <li>Generate academic transcripts and institutional reporting for university faculty.</li>
            <li>Detect refresh token reuse, unauthorized account takeovers, and fraudulent credential attempts.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            4. Domestic Payments & Financial Privacy
          </h2>
          <p>
            Payments conducted through Telebirr, CBE Birr, or local banking integrations are processed directly through secured API webhooks. EduVerse does not store your banking PINs, payment credentials, or financial account balances.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            5. Data Protection & Security Controls
          </h2>
          <p>
            We implement industry-standard defensive controls:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>Zero plaintext password storage: passwords hashed with memory-hard Argon2id parameters.</li>
            <li>Short-lived access tokens with automatic refresh token rotation and token family theft detection.</li>
            <li>Strict PostgreSQL database row-level tenant guards isolating university records.</li>
            <li>HTTPS TLS 1.3 encryption across all network transmissions.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand-navy">
            6. Inquiries & Data Privacy Officer
          </h2>
          <p>
            If you have questions regarding your educational data, wish to request a data export, or request account deletion, contact our Data Protection Officer at:
          </p>
          <div className="rounded-lg border border-brand-border bg-slate-50 p-4 text-xs">
            <strong className="text-brand-navy block">EduVerse Legal & Compliance Team</strong>
            <span>Bole Sub-City, Addis Ababa, Ethiopia</span>
            <br />
            <span>Email: privacy@eduverse.et</span>
          </div>
        </section>
      </div>
    </div>
  );
}
