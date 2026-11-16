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

  const downloadUrl = `${getBaseUrl()}/certificates/download/${encodeURIComponent(verificationCode)}`;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-6">
        <Link
          href="/verify"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-slate dark:text-stone-400 hover:text-brand-orange transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Verify Another Certificate</span>
        </Link>

        {isLoading ? (
          <Card className="p-8 space-y-6 border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900">
            <Skeleton className="h-10 w-48 mx-auto" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ) : isError || !data || data.status === 'NOT_FOUND' ? (
          <Card className="border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 shadow-sm text-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-900">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-red-900 dark:text-red-300">Certificate Not Found</h2>
              <p className="text-xs text-red-700 dark:text-red-400 max-w-md mx-auto">
                No accredited certificate was found matching verification code <code className="font-mono font-bold bg-white/70 dark:bg-stone-800 px-1.5 py-0.5 rounded">{verificationCode}</code>.
              </p>
            </div>
            <p className="text-xs text-brand-slate dark:text-stone-400">
              Please double check the spelling and code format. If you believe this is an error, please contact EduVerse Accreditation Support.
            </p>
            <div className="pt-2">
              <Link href="/verify">
                <Button variant="outline" size="sm" className="border-brand-border dark:border-stone-700">Search Again</Button>
              </Link>
            </div>
          </Card>
        ) : data.status === 'REVOKED' ? (
          <Card className="border border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <Badge variant="destructive" className="bg-red-600 text-white gap-1 text-[11px]">
                  <ShieldAlert className="h-3 w-3" />
                  Certificate Revoked
                </Badge>
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">This Credential Has Been Revoked</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">
                  Reason: {data.revocationReason || 'Revoked by institutional authority.'}
                </p>
              </div>
            </div>

            {data.certificate && (
              <div className="space-y-3 pt-4 border-t border-amber-200/60 dark:border-amber-900/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-slate dark:text-stone-400">Recipient:</span>
                  <span className="font-semibold text-brand-coffee dark:text-stone-200">{data.certificate.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-slate dark:text-stone-400">Course:</span>
                  <span className="font-semibold text-brand-coffee dark:text-stone-200">{data.certificate.courseTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-slate dark:text-stone-400">Verification ID:</span>
                  <code className="font-mono text-brand-coffee dark:text-stone-200 font-semibold">{data.certificate.verificationCode}</code>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="relative overflow-hidden border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-lg">
            <div className="h-2 w-full bg-gradient-to-r from-brand-orange via-amber-500 to-brand-orange" />

            <CardHeader className="p-6 sm:p-8 pb-4 border-b border-brand-border dark:border-stone-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-brand-orange dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800 gap-1 text-[11px] mb-1">
                      <CheckCircle2 className="h-3 w-3 text-brand-orange" />
                      Authentic & Accredited Credential
                    </Badge>
                    <CardTitle className="text-xl sm:text-2xl font-extrabold text-brand-coffee dark:text-stone-100">
                      Official Certificate of Completion
                    </CardTitle>
                  </div>
                </div>

                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="orange" size="sm" className="gap-1.5 text-xs shadow-sm">
                    <Download className="h-3.5 w-3.5" />
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
                      <span className="text-[11px] uppercase font-bold text-brand-orange tracking-wider">
                        Awarded To
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100 mt-0.5 flex items-center gap-2.5">
                        <User className="h-6 w-6 text-brand-orange" />
                        <span>{data.certificate.studentName}</span>
                      </h3>
                    </div>

                    <div className="p-4 rounded-xl bg-brand-creamy dark:bg-stone-800/60 border border-brand-border dark:border-stone-700 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-orange flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5" />
                        <span>{data.certificate.institutionName}</span>
                      </span>
                      <h4 className="text-lg font-bold text-brand-coffee dark:text-stone-100">
                        {data.certificate.courseTitle}
                      </h4>
                      <p className="text-xs text-brand-slate dark:text-stone-400">
                        Instructed by <strong className="text-brand-coffee dark:text-stone-200">{data.certificate.instructorName}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-brand-border dark:border-stone-800 text-xs">
                    <div className="space-y-1">
                      <span className="text-brand-slate dark:text-stone-400 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-orange" />
                        <span>Completion Date:</span>
                      </span>
                      <p className="font-bold text-brand-coffee dark:text-stone-100 text-sm">
                        {new Date(data.certificate.completionDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-brand-slate dark:text-stone-400 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-brand-orange" />
                        <span>Unique Verification ID:</span>
                      </span>
                      <code className="block bg-brand-creamy dark:bg-stone-800 border border-brand-border dark:border-stone-700 p-2 rounded-lg font-mono font-bold text-brand-coffee dark:text-stone-100 text-xs">
                        {data.certificate.verificationCode}
                      </code>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    {data.certificate.courseSlug && (
                      <Link href={`/courses/${data.certificate.courseSlug}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-brand-border dark:border-stone-700 hover:border-brand-orange/40">
                          <span>View Course Curriculum</span>
                          <ExternalLink className="h-3.5 w-3.5 text-brand-orange" />
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
