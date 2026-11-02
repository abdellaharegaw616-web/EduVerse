import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 px-4">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute h-12 w-12 rounded-full border-4 border-brand-mint border-t-brand-emerald animate-spin" />
      </div>
      <p className="text-sm font-medium text-brand-slate animate-pulse">
        Loading EduVerse experience...
      </p>
    </div>
  );
}
