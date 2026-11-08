'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Key, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special symbol (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenParam,
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.post<{ message: string }>(
        '/auth/reset-password',
        {
          token: data.token,
          newPassword: data.newPassword,
        },
      );

      setSuccessMessage(
        response?.message || 'Password reset successfully. Redirecting to login...',
      );

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Failed to reset password. The reset token may be invalid or expired.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
      {errorMessage && (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Reset Failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="token" required>Reset Security Token</Label>
          <Input
            id="token"
            placeholder="Paste your reset token"
            {...register('token')}
            error={errors.token?.message}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="newPassword" required>New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="••••••••••••"
            {...register('newPassword')}
            error={errors.newPassword?.message}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" required>Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••••••"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
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
          <Key className="h-4 w-4" />
          <span>Reset Password</span>
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
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
            Choose a New Password
          </h1>
          <p className="text-xs text-brand-slate">
            Enter your verification token and select a new secure password.
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-xs text-brand-slate">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

