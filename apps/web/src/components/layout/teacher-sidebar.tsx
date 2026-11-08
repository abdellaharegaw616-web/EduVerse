'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  FileCheck2,
  BarChart3,
  User,
  LogOut,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';

export function TeacherSidebar() {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>('/users/profile'),
    enabled: !!authUser?.id,
    staleTime: 1000 * 30,
  });

  const user = profileData || authUser;

  const navItems = [
    {
      label: 'Studio Dashboard',
      href: '/teacher/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'My Courses',
      href: '/teacher/courses',
      icon: BookOpen,
    },
    {
      label: 'Create Course',
      href: '/teacher/courses/create',
      icon: PlusCircle,
    },
    {
      label: 'Grading Queue',
      href: '/teacher/grading',
      icon: FileCheck2,
    },
    {
      label: 'Course Analytics',
      href: '/teacher/analytics',
      icon: BarChart3,
    },
    {
      label: 'Instructor Profile',
      href: '/teacher/profile',
      icon: User,
    },
  ];

  return (
    <aside className="w-64 border-r border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none transition-colors">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* User Card */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-brand-border dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-navy dark:bg-slate-700 text-brand-mint dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-sm shadow-xs overflow-hidden">
            {user?.profile?.avatarUrl ? (
              <img src={user.profile.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              user?.fullName?.charAt(0) || 'T'
            )}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-brand-navy dark:text-slate-100 truncate">
              {user?.fullName || 'Educator'}
            </h4>
            <span className="text-[10px] text-brand-emerald dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {user?.role || 'TEACHER'}
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate dark:text-slate-400 px-3">
            Teacher Studio
          </span>
          <nav className="space-y-0.5 pt-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/teacher/courses'
                  ? pathname.startsWith('/teacher/courses') && pathname !== '/teacher/courses/create'
                  : pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-xs font-semibold'
                      : 'text-brand-slate dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-navy dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mode Switcher */}
        <div className="pt-2 border-t border-brand-border/60 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate dark:text-slate-400 px-3">
            Mode Switcher
          </span>
          <div className="pt-1.5">
            <Link
              href="/app/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-brand-emerald dark:text-emerald-400 bg-brand-mint/50 dark:bg-emerald-950/60 hover:bg-brand-mint dark:hover:bg-emerald-950 transition-colors"
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>Switch to Student Mode</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer / Sign Out */}
      <div className="p-4 border-t border-brand-border dark:border-slate-800">
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
