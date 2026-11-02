'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ProtectedRoute } from './protected-route';
import { ShieldAlert, ArrowLeft, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function TeacherRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center bg-brand-page">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-emerald border-t-transparent" />
        </div>
      ) : user &&
        (user.role === 'TEACHER' ||
          user.role === 'INDEPENDENT_INSTRUCTOR' ||
          user.role === 'SUPER_ADMIN') ? (
        children
      ) : (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle className="text-base font-bold">
                Instructor Credentials Required
              </AlertTitle>
              <AlertDescription className="text-xs leading-relaxed mt-1">
                Your current account ({user?.email}) has the <strong>{user?.role}</strong> role.
                The Teacher Studio and curriculum management workflows are restricted to verified faculty members,
                institutional educators, and course authors.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
              <Link href="/app/dashboard" className="w-full sm:w-auto">
                <Button variant="default" className="w-full gap-2 text-xs">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Return to Student Dashboard</span>
                </Button>
              </Link>
              <Link href="/contact" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full gap-2 text-xs">
                  <GraduationCap className="h-4 w-4" />
                  <span>Apply for Teacher Account</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

