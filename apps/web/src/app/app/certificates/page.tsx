'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Download,
  Copy,
  Check,
  Building,
  Calendar,
  AlertCircle,
  ShieldCheck,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { apiClient, getBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CertificateItem {
  id: string;
  verificationCode: string;
  courseTitle: string;
  courseSlug: string;
  studentName: string;
  instructorName: string;
  institutionName: string;
  completionDate: string;
  issuedAt: string;
}

export default function StudentCertificatesPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const {
    data: certificates,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CertificateItem[]>({
    queryKey: ['my-certificates'],
    queryFn: () => apiClient.get<CertificateItem[]>('/certificates/my'),
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDownload = (code: string) => {
    const downloadUrl = `${getBaseUrl()}/certificates/download/${encodeURIComponent(code)}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Accreditation & Credentials
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100 flex items-center gap-2.5">
            <Award className="h-7 w-7 text-brand-orange" />
            <span>Earned Certificates & Awards</span>
          </h1>
          <p className="text-xs text-brand-slate dark:text-stone-400 mt-1">
            Cryptographically verifiable completion certificates with unique codes for every completed curriculum.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/verify">
            <Button variant="outline" size="sm" className="border-brand-border dark:border-stone-700 hover:border-brand-orange/40 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
              <span>Public Verification</span>
            </Button>
          </Link>
          <Link href="/app/courses">
            <Button variant="orange" size="sm" className="text-xs">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              <span>My Courses</span>
            </Button>
          </Link>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive" className="bg-red-950/40 border-red-900 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-bold">Unable to Load Certificates</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs mt-1">
            <span>{(error as any)?.message || 'Failed to fetch certificate records.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs border-red-800">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Certificates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : certificates && certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <Card
              key={cert.id}
              className="relative overflow-hidden border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:border-brand-orange/50 hover:shadow-md transition-all duration-200"
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-brand-orange via-amber-500 to-brand-orange" />

              <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-100/80 text-brand-orange dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                      <Award className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800 gap-1 text-[11px]">
                      <ShieldCheck className="h-3 w-3 text-brand-orange" />
                      Verified Credential
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold tracking-wide text-brand-orange uppercase flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {cert.institutionName}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-brand-coffee dark:text-stone-100 mt-1 line-clamp-2">
                      {cert.courseTitle}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-brand-border dark:border-stone-800">
                    <div className="flex items-center justify-between text-xs text-brand-slate dark:text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-orange" />
                        <span>Date Issued:</span>
                      </span>
                      <span className="font-semibold text-brand-coffee dark:text-stone-200">
                        {new Date(cert.issuedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-brand-slate dark:text-stone-400">
                      <span>Unique Verification ID:</span>
                      <div className="flex items-center gap-1">
                        <code className="bg-brand-creamy dark:bg-stone-800 border border-brand-border dark:border-stone-700 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-brand-coffee dark:text-stone-200">
                          {cert.verificationCode}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(cert.verificationCode)}
                          className="p-1 text-brand-slate dark:text-stone-400 hover:text-brand-orange transition-colors"
                          title="Copy Verification ID"
                        >
                          {copiedCode === cert.verificationCode ? (
                            <Check className="h-3.5 w-3.5 text-brand-orange" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1.5 border-brand-border dark:border-stone-700 hover:border-brand-orange/40"
                    onClick={() => handleDownload(cert.verificationCode)}
                  >
                    <Download className="h-3.5 w-3.5 text-brand-orange" />
                    <span>Download PDF</span>
                  </Button>

                  <Link
                    href={`/verify/${encodeURIComponent(cert.verificationCode)}`}
                    target="_blank"
                    className="flex-1"
                  >
                    <Button variant="orange" size="sm" className="w-full text-xs gap-1.5 shadow-sm">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Verify Online</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Award}
          title="No Certificates Earned Yet"
          description="Complete 100% of video lessons, reading materials, quizzes, and assignments in any enrolled course to be awarded your official verified credential."
          actionHref="/app/courses"
          actionLabel="Continue Learning"
        />
      )}
    </div>
  );
}
