'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Award, CheckCircle2, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function PublicVerifySearchPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) {
      router.push(`/verify/${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 text-brand-orange dark:bg-orange-950/60 dark:text-orange-400 mb-2 border border-orange-200 dark:border-orange-900/60 shadow-sm">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange block">
            Accreditation Registry
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-coffee dark:text-stone-100 tracking-tight">
            Verify an EduVerse Certificate
          </h1>
          <p className="text-sm text-brand-slate dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            Validate the authenticity, accreditation, and verified completion status of certificates issued across Ethiopia on the EduVerse platform.
          </p>
        </div>

        <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-brand-coffee dark:text-stone-100">
              Enter Verification Code
            </CardTitle>
            <CardDescription className="text-xs text-brand-slate dark:text-stone-400">
              Enter the unique verification ID printed at the footer of the official certificate (e.g. EV-2026-A1B2C3D4E5F60789).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slate dark:text-stone-500" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EV-2026-XXXX-XXXX-XXXX"
                  className="pl-10 font-mono uppercase tracking-wider text-sm h-11 border-brand-border dark:border-stone-700 focus-visible:ring-brand-orange"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="orange"
                disabled={!code.trim()}
                className="w-full font-semibold h-11 shadow-sm text-sm"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                <span>Verify Credential Authenticity</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center text-xs text-brand-slate dark:text-stone-400">
          <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex flex-col items-center gap-1 shadow-sm">
            <Award className="h-4 w-4 text-brand-orange" />
            <span className="font-bold text-brand-coffee dark:text-stone-200">Cryptographic Proof</span>
            <span className="text-[11px]">Tamper-proof backend registry verification</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex flex-col items-center gap-1 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-brand-orange" />
            <span className="font-bold text-brand-coffee dark:text-stone-200">100% Curriculum Audit</span>
            <span className="text-[11px]">Verified completion of all lessons & tests</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-brand-border dark:border-stone-800 flex flex-col items-center gap-1 shadow-sm">
            <Lock className="h-4 w-4 text-brand-orange" />
            <span className="font-bold text-brand-coffee dark:text-stone-200">Anti-Fraud Protection</span>
            <span className="text-[11px]">Cryptographic unique code issuance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
