import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-mint text-brand-emerald">
        <FileQuestion className="h-10 w-10" />
      </div>
      <div className="space-y-2 max-w-md">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
          Error 404
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">
          Page Not Found
        </h1>
        <p className="text-sm text-brand-slate">
          The educational resource or page you are looking for does not exist or may have been relocated.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button variant="emerald" className="gap-2">
            <Home className="h-4 w-4" />
            <span>Go to Homepage</span>
          </Button>
        </Link>
        <Link href="/courses">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Explore Courses</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
