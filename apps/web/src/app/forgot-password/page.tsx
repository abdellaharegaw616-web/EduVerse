'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.post<{ message: string }>(
        '/auth/forgot-password',
        data,
      );

      setSuccessMessage(
        response?.message ||
          'If an account exists with that email address, a password reset link has been dispatched.',
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to process request. Please try again later.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="EduVerse Logo"
              className="h-10 w-10 object-contain rounded-xl shadow-xs"
            />
            <span className="font-extrabold tracking-tight text-brand-navy text-2xl">
              Edu<span className="text-brand-emerald">Verse</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
            Forgot Your Password?
          </h1>
          <p className="text-xs text-brand-slate">
            Provide your registered academic email address and we will dispatch password recovery instructions.
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-xl border border-brand-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
          {errorMessage && (
            <Alert variant="destructive" className="animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Request Failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" className="animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Reset Link Dispatched</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email" required>Registered Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@domain.edu.et"
                {...register('email')}
                error={errors.email?.message}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              variant="emerald"
              size="lg"
              className="w-full gap-2 font-bold mt-2"
              isLoading={isLoading}
            >
              <KeyRound className="h-4 w-4" />
              <span>Send Recovery Email</span>
            </Button>
          </form>

          <div className="pt-4 border-t border-brand-border text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-brand-slate hover:text-brand-emerald font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

