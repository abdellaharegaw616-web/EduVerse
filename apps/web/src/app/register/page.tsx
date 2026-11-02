'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BookOpen, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special symbol (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms of Service & Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      agreeTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await registerUser(
        data.fullName,
        data.email,
        data.password,
      );

      setSuccessMessage(
        response?.message ||
          'Account created successfully. A verification link has been dispatched to your email.',
      );

      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      const message =
        err?.message ||
        (Array.isArray(err?.errors) ? err.errors[0]?.message : null) ||
        'Registration failed. Please check your information and try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
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
            Create Your Student Account
          </h1>
          <p className="text-xs text-brand-slate">
            Join thousands of Ethiopian students advancing their vocational and academic careers.
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-xl border border-brand-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
          {errorMessage && (
            <Alert variant="destructive" className="animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" className="animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Account Registered</AlertTitle>
              <AlertDescription>{successMessage} Redirecting to login...</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="fullName" required>Full Name</Label>
              <Input
                id="fullName"
                placeholder="e.g. Chala Tadesse"
                {...register('fullName')}
                error={errors.fullName?.message}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="email" required>Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="chala@gmail.com"
                {...register('email')}
                error={errors.email?.message}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" required>Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  {...register('password')}
                  error={errors.password?.message}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" required>Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••••••"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="rounded-md bg-slate-50 border border-brand-border p-3 text-[11px] text-brand-slate space-y-1">
              <span className="font-semibold text-brand-navy block">Security Requirements:</span>
              <p>Minimum 8 characters with at least one uppercase, one lowercase, one number, and one special symbol.</p>
            </div>

            <div className="space-y-1 pt-1">
              <label className="flex items-start gap-2 text-xs text-brand-slate cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-brand-border text-brand-emerald focus:ring-brand-emerald"
                  {...register('agreeTerms')}
                  disabled={isLoading}
                />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" className="text-brand-emerald underline">Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-brand-emerald underline">Privacy Policy</Link>.
                </span>
              </label>
              {errors.agreeTerms?.message && (
                <p className="text-xs text-red-600">{errors.agreeTerms.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="emerald"
              size="lg"
              className="w-full gap-2 font-bold mt-2"
              isLoading={isLoading}
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Student Account</span>
            </Button>
          </form>

          <div className="pt-4 border-t border-brand-border text-center text-xs text-brand-slate">
            Already registered on EduVerse?{' '}
            <Link
              href="/login"
              className="text-brand-emerald font-semibold hover:underline"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
