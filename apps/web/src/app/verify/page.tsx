'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Award, CheckCircle2 } from 'lucide-react';
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
      router.push(`/verify/${trimmed}`);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-emerald/10 text-brand-emerald mb-2">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">
            Verify an EduVerse Certificate
          </h1>
          <p className="text-sm text-brand-slate max-w-md mx-auto">
            Validate the authenticity, accreditation, and completion status of certificates issued across Ethiopia on the EduVerse platform.
          </p>
        </div>

        <Card className="border border-brand-border shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-brand-navy">Enter Verification Code</CardTitle>
            <CardDescription className="text-xs">
              Look for the code printed at the footer of the official certificate (e.g. EV-2026-A1B2C3D4E5F60789).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slate/60" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EV-2026-XXXX-XXXX-XXXX"
                  className="pl-10 font-mono uppercase tracking-wider text-sm h-11"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={!code.trim()}
                className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold h-10"
              >
                Verify Credential
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-center text-xs text-brand-slate">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center gap-1">
            <Award className="h-4 w-4 text-brand-emerald" />
            <span className="font-semibold text-brand-navy">Cryptographic Proof</span>
            <span>Tamper-proof backend verification</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-brand-navy">100% Curriculum Audit</span>
            <span>Verified completion of all modules</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-brand-navy">Accreditation Seals</span>
            <span>Official institutional backing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

