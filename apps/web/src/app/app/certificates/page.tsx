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
  institutionName: string;
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
    const downloadUrl = `${getBaseUrl()}/certificates/download/${code}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Accreditation
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Earned Certificates & Awards
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Cryptographically verifiable proof of mastery for every completed curriculum.
          </p>
        </div>

        <Link href="/app/courses">
          <Button variant="outline" size="sm">Browse Courses</Button>
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Load Certificates</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to fetch certificate records.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
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
              className="relative overflow-hidden border border-brand-amber/30 bg-gradient-to-br from-white via-amber-50/20 to-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-amber/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

              <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                      <Award className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 text-[11px]">
                      <ShieldCheck className="h-3 w-3" />
                      Verified Credential
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold tracking-wide text-brand-slate uppercase flex items-center gap-1">
                      <Building className="h-3 w-3 text-brand-emerald" />
                      {cert.institutionName}
                    </span>
                    <h3 className="text-lg font-bold text-brand-navy mt-1 line-clamp-2">
                      {cert.courseTitle}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-brand-border/60">
                    <div className="flex items-center justify-between text-xs text-brand-slate">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-slate/70" />
                        Date Issued:
                      </span>
                      <span className="font-semibold text-brand-navy">
                        {new Date(cert.issuedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-brand-slate">
                      <span>Verification ID:</span>
                      <div className="flex items-center gap-1">
                        <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono font-medium text-brand-navy">
                          {cert.verificationCode}
                        </code>
                        <button
                          onClick={() => handleCopy(cert.verificationCode)}
                          className="p-1 text-brand-slate hover:text-brand-navy transition-colors"
                          title="Copy Verification ID"
                        >
                          {copiedCode === cert.verificationCode ? (
                            <Check className="h-3.5 w-3.5 text-brand-emerald" />
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
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => handleDownload(cert.verificationCode)}
                  >
                    <Download className="h-3.5 w-3.5 text-brand-emerald" />
                    <span>Download PDF</span>
                  </Button>

                  <Link
                    href={`/verify/${cert.verificationCode}`}
                    target="_blank"
                    className="flex-1"
                  >
                    <Button variant="default" size="sm" className="w-full text-xs gap-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-emerald" />
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
          title="No Certificates Yet"
          description="Complete 100% of video lessons, reading materials, quizzes, and assignments in any enrolled course to be awarded your certified certificate."
          actionHref="/app/courses"
          actionLabel="Continue Learning"
        />
      )}
    </div>
  );
}

