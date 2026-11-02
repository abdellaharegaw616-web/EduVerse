'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { TeacherRoute } from '@/components/auth/teacher-route';
import { TeacherSidebar } from '@/components/layout/teacher-sidebar';

export default function TeacherAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <TeacherRoute>
      <div className="flex min-h-[calc(100vh-4rem)] bg-brand-page">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <TeacherSidebar />
        </div>

        {/* Mobile Sidebar Toggle Header */}
        <div className="md:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-emerald"
            aria-label="Toggle Teacher Studio Navigation"
          >
            {mobileSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-50 w-72 bg-white h-full shadow-2xl animate-in slide-in-from-left duration-200">
              <TeacherSidebar />
            </div>
          </div>
        )}

        {/* Main Teacher Studio Workspace Area */}
        <div className="flex-1 overflow-x-hidden p-4 sm:p-8">
          {children}
        </div>
      </div>
    </TeacherRoute>
  );
}

