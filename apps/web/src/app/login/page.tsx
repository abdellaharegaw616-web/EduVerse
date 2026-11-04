'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BookOpen, LogIn, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = searchParams.get('redirect');
  const isLoggedOut = searchParams.get('logout') === 'success';
  const isExpired = searchParams.get('expired') === 'true';

  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await login(data.email, data.password);
      setSuccessUser(user.fullName || user.email);

      const defaultRedirect =
        user.role === 'SUPER_ADMIN'
          ? '/admin'
          : user.role === 'TEACHER' || user.role === 'INDEPENDENT_INSTRUCTOR'
          ? '/teacher/dashboard'
          : '/app/dashboard';

      setTimeout(() => {
        router.push(explicitRedirect || defaultRedirect);
      }, 1000);
    } catch (err: any) {
      const message =
        err?.message ||
        (Array.isArray(err?.errors) ? err.errors[0]?.message : null) ||
        'Authentication failed. Please verify your email and password.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
      {isLoggedOut && !errorMessage && !successUser && (
        <Alert variant="info" className="animate-in fade-in duration-200">
          <Info className="h-4 w-4" />
          <AlertTitle>Signed Out</AlertTitle>
          <AlertDescription>You have been safely signed out of your account.</AlertDescription>
        </Alert>
      )}

      {isExpired && !errorMessage && !successUser && (
        <Alert variant="warning" className="animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Expired</AlertTitle>
          <AlertDescription>Your security session expired. Please sign in again to continue.</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sign In Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successUser && (
        <Alert variant="success" className="animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Authenticated Successfully</AlertTitle>
          <AlertDescription>
            Welcome back, {successUser}. Redirecting to your dashboard...
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email" required>Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@domain.edu.et"
            {...register('email')}
            error={errors.email?.message}
            disabled={isLoading}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="password" required className="mb-0">Password</Label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-brand-emerald hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••••••"
            {...register('password')}
            error={errors.password?.message}
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
          <LogIn className="h-4 w-4" />
          <span>Sign In</span>
        </Button>
      </form>

      <div className="pt-4 border-t border-brand-border text-center text-xs text-brand-slate">
        Don’t have an EduVerse account yet?{' '}
        <Link
          href="/register"
          className="text-brand-emerald font-semibold hover:underline"
        >
          Create Account Free
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
            Sign In to Your Account
          </h1>
          <p className="text-xs text-brand-slate">
            Enter your academic credentials to resume your coursework.
          </p>
        </div>

        <Suspense fallback={<div className="p-8 text-center text-xs text-brand-slate">Loading form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
