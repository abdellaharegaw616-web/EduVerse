'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { StudentSidebar } from '@/components/layout/student-sidebar';

export default function StudentAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };

    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileSidebarOpen]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-[calc(100vh-4rem)] bg-brand-page dark:bg-slate-950 transition-colors">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <StudentSidebar />
        </div>

        {/* Mobile Sidebar Toggle Button */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy dark:bg-slate-800 text-white shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-brand-emerald"
            aria-label="Toggle Navigation Drawer"
          >
            {mobileSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Sidebar Drawer Modal */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex animate-in fade-in duration-200">
            <div
              className="fixed inset-0 bg-brand-navy/60 dark:bg-black/70 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto">
              <StudentSidebar onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <div className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
