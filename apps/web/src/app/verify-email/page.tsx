'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, CheckCircle2, AlertCircle, MailCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setErrorMessage('Please provide a valid verification token.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      await apiClient.post('/auth/verify-email', { token: tokenToVerify.trim() });
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Verification failed. The token may have expired or is invalid.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  return (
    <div className="rounded-xl border border-brand-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {success ? (
        <div className="text-center space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-brand-emerald mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-brand-navy">Email Verified Successfully</h3>
            <p className="text-xs text-brand-slate">
              Your EduVerse student account is now fully activated and verified.
            </p>
          </div>
          <Link href="/login" className="block pt-2">
            <Button variant="emerald" size="lg" className="w-full gap-2">
              <span>Sign In to Your Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {errorMessage && (
            <Alert variant="destructive" className="animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="token" required>Verification Token</Label>
              <Input
                id="token"
                placeholder="Paste the verification token from your email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isVerifying}
              />
            </div>

            <Button
              variant="emerald"
              size="lg"
              className="w-full gap-2 font-bold"
              isLoading={isVerifying}
              onClick={() => handleVerify(token)}
            >
              <MailCheck className="h-4 w-4" />
              <span>Verify Account</span>
            </Button>
          </div>

          <div className="pt-4 border-t border-brand-border text-center text-xs text-brand-slate">
            Need a new verification link?{' '}
            <Link href="/contact" className="text-brand-emerald font-semibold hover:underline">
              Contact Support
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy text-white shadow-sm">
              <BookOpen className="h-5 w-5 text-brand-emerald" />
            </div>
            <span className="font-extrabold tracking-tight text-brand-navy text-2xl">
              Edu<span className="text-brand-emerald">Verse</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
            Verify Your Email Address
          </h1>
          <p className="text-xs text-brand-slate">
            Confirm your identity to activate all course features and certificates.
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-xs text-brand-slate">Loading verification...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}

