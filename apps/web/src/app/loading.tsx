import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 px-4 bg-brand-page dark:bg-slate-950">
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-brand-emerald dark:border-slate-800 dark:border-t-emerald-400 animate-spin" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-slate dark:text-slate-400">
        Loading EduVerse Platform...
      </p>
    </div>
  );
}
