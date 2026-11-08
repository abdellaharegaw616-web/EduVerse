'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Calendar,
  Building,
  User,
  Download,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient, getBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface VerificationResponse {
  isValid: boolean;
  status: 'VALID' | 'REVOKED' | 'NOT_FOUND';
  message: string;
  revokedAt?: string;
  revocationReason?: string;
  certificate?: {
    id: string;
    verificationCode: string;
    courseTitle: string;
    courseSlug?: string;
    studentName: string;
    instructorName: string;
    institutionName: string;
    completionDate: string;
    issuedAt: string;
  };
}

export default function PublicVerifyResultPage() {
  const params = useParams();
  const rawCode = (params?.code as string) || '';
  const verificationCode = decodeURIComponent(rawCode).trim().toUpperCase();

  const { data, isLoading, isError } = useQuery<VerificationResponse>({
    queryKey: ['public-verify-certificate', verificationCode],
    queryFn: () => apiClient.get<VerificationResponse>(`/certificates/verify/${verificationCode}`),
    enabled: Boolean(verificationCode),
  });

  const downloadUrl = `${getBaseUrl()}/certificates/download/${verificationCode}`;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-6">
        <Link
          href="/verify"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-slate hover:text-brand-navy transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Verify Another Certificate</span>
        </Link>

        {isLoading ? (
          <Card className="p-8 space-y-6 border border-brand-border">
            <Skeleton className="h-10 w-48 mx-auto" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ) : isError || !data || data.status === 'NOT_FOUND' ? (
          <Card className="border border-red-200 bg-red-50/30 shadow-sm text-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-red-900">Certificate Not Found</h2>
              <p className="text-xs text-red-700 max-w-md mx-auto">
                No accredited certificate was found matching verification code <code className="font-mono font-bold">{verificationCode}</code>.
              </p>
            </div>
            <p className="text-xs text-brand-slate">
              Please double check the spelling and code format. If you believe this is an error, contact EduVerse Accreditation Support.
            </p>
            <div className="pt-2">
              <Link href="/verify">
                <Button variant="outline" size="sm">Search Again</Button>
              </Link>
            </div>
          </Card>
        ) : data.status === 'REVOKED' ? (
          <Card className="border border-amber-300 bg-amber-50/40 shadow-sm p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <Badge variant="destructive" className="bg-red-600 text-white gap-1 text-[11px]">
                  <ShieldAlert className="h-3 w-3" />
                  Certificate Revoked
                </Badge>
                <h2 className="text-lg font-bold text-brand-navy">This Credential Has Been Revoked</h2>
                <p className="text-xs text-brand-slate">
                  Reason: {data.revocationReason || 'Revoked by institutional authority.'}
                </p>
              </div>
            </div>

            {data.certificate && (
              <div className="space-y-3 pt-4 border-t border-amber-200/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-slate">Recipient:</span>
                  <span className="font-semibold text-brand-navy">{data.certificate.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-slate">Course:</span>
                  <span className="font-semibold text-brand-navy">{data.certificate.courseTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-slate">Verification ID:</span>
                  <code className="font-mono text-brand-navy font-semibold">{data.certificate.verificationCode}</code>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="relative overflow-hidden border border-emerald-300 dark:border-emerald-800/40 bg-white dark:bg-slate-900 shadow-md">

            <CardHeader className="p-6 sm:p-8 pb-4 border-b border-brand-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-brand-emerald flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 text-[11px] mb-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Authentic & Verified
                    </Badge>
                    <CardTitle className="text-xl sm:text-2xl font-black text-brand-navy">
                      Accredited Certificate
                    </CardTitle>
                  </div>
                </div>

                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-brand-navy border-brand-border">
                    <Download className="h-3.5 w-3.5 text-brand-emerald" />
                    <span>Download PDF</span>
                  </Button>
                </a>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {data.certificate && (
                <>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs uppercase font-bold text-brand-slate tracking-wider">
                        Awarded To
                      </span>
                      <h3 className="text-2xl font-extrabold text-brand-navy mt-0.5 flex items-center gap-2">
                        <User className="h-5 w-5 text-brand-emerald" />
                        {data.certificate.studentName}
                      </h3>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-emerald flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {data.certificate.institutionName}
                      </span>
                      <h4 className="text-lg font-bold text-brand-navy">
                        {data.certificate.courseTitle}
                      </h4>
                      <p className="text-xs text-brand-slate">
                        Instructed by <span className="font-semibold text-brand-navy">{data.certificate.instructorName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-brand-border/60 text-xs">
                    <div className="space-y-1">
                      <span className="text-brand-slate flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Completion Date:
                      </span>
                      <p className="font-semibold text-brand-navy text-sm">
                        {new Date(data.certificate.completionDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-brand-slate flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        Verification ID:
                      </span>
                      <code className="block bg-slate-100 p-1.5 rounded font-mono font-bold text-brand-navy text-xs">
                        {data.certificate.verificationCode}
                      </code>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    {data.certificate.courseSlug && (
                      <Link href={`/courses/${data.certificate.courseSlug}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                          <span>View Course Curriculum</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
