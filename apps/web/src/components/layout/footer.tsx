import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Globe, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-brand-border bg-white text-brand-navy">
      <div className="container mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5">
              <img
                src="/logo.png"
                alt="EduVerse Logo"
                className="h-9 w-9 object-contain rounded-lg shadow-xs"
              />
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-brand-navy text-lg leading-none">
                  Edu<span className="text-brand-emerald">Verse</span>
                </span>
                <span className="text-[10px] text-brand-slate tracking-wide font-medium">
                  Learn Beyond Boundaries
                </span>
              </div>
            </Link>
            <p className="text-sm text-brand-slate leading-relaxed max-w-sm">
              Empowering Ethiopian students, educators, and universities with an accessible, low-bandwidth, and verifiable educational SaaS platform.
            </p>
            <div className="space-y-1.5 text-xs text-brand-slate pt-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-emerald shrink-0" />
                <span>Bole Sub-City, Addis Ababa, Ethiopia</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-emerald shrink-0" />
                <span>+251 97 956 7153 / 0979567153</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-emerald shrink-0" />
                <a href="mailto:abdellaj636@gmail.com" className="hover:text-brand-emerald transition-colors">
                  abdellaj636@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Catalog */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-navy">
              Top Disciplines
            </h4>
            <ul className="space-y-2 text-sm text-brand-slate">
              <li>
                <Link href="/courses?category=computer-science" className="hover:text-brand-emerald transition-colors">
                  Computer Science & AI
                </Link>
              </li>
              <li>
                <Link href="/courses?category=engineering" className="hover:text-brand-emerald transition-colors">
                  Engineering & Robotics
                </Link>
              </li>
              <li>
                <Link href="/courses?category=business" className="hover:text-brand-emerald transition-colors">
                  Business & Accounting
                </Link>
              </li>
              <li>
                <Link href="/courses?category=health" className="hover:text-brand-emerald transition-colors">
                  Public Health & Medicine
                </Link>
              </li>
              <li>
                <Link href="/courses?category=languages" className="hover:text-brand-emerald transition-colors">
                  Languages & Amharic Studies
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-navy">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-brand-slate">
              <li>
                <Link href="/courses" className="hover:text-brand-emerald transition-colors">
                  Course Catalog
                </Link>
              </li>
              <li>
                <Link href="/instructors" className="hover:text-brand-emerald transition-colors">
                  Verified Instructors
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-brand-emerald transition-colors">
                  Plans & Pricing
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-emerald transition-colors">
                  Institutional Partnerships
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-emerald" />
                <span className="text-xs text-brand-slate">Verifiable Certificates</span>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-navy">
              Legal & Company
            </h4>
            <ul className="space-y-2 text-sm text-brand-slate">
              <li>
                <Link href="/about" className="hover:text-brand-emerald transition-colors">
                  About EduVerse
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-emerald transition-colors">
                  Help & Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-emerald transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-emerald transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between text-xs text-brand-slate gap-4">
          <p>© {new Date().getFullYear()} EduVerse Inc. All rights reserved. Built for Ethiopian Education.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-brand-emerald" />
              <span>English (US) / Amharic</span>
            </span>
            <span className="inline-block h-3 w-px bg-slate-300" />
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Low-Bandwidth 3G Optimized
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
