'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  History,
  FileCheck2,
  HelpCircle,
  Award,
  Bell,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const STUDENT_NAV_ITEMS = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/courses', label: 'My Courses', icon: BookOpen },
  { href: '/app/progress', label: 'Learning Progress', icon: TrendingUp },
  { href: '/app/recent-lessons', label: 'Recent Lessons', icon: History },
  { href: '/app/assignments', label: 'Assignments', icon: FileCheck2 },
  { href: '/app/quizzes', label: 'Quiz History', icon: HelpCircle },
  { href: '/app/certificates', label: 'Certificates', icon: Award },
  { href: '/app/notifications', label: 'Notifications', icon: Bell },
  { href: '/app/profile', label: 'Student Profile', icon: User },
  { href: '/app/settings', label: 'Account Settings', icon: Settings },
];

export interface StudentSidebarProps {
  onNavigate?: () => void;
}

export function StudentSidebar({ onNavigate }: StudentSidebarProps) {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>('/users/profile'),
    enabled: !!authUser?.id,
    staleTime: 1000 * 30,
  });

  const user = profileData || authUser;

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside className="w-64 border-r border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] transition-colors">
      {/* Top: Nav Links */}
      <div className="p-4 space-y-6">
        {/* User Identity Chip */}
        <Link
          href="/app/profile"
          onClick={handleLinkClick}
          className="rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-brand-border dark:border-slate-800 p-3 flex items-center gap-3 hover:border-brand-emerald/40 transition-colors block"
        >
          <div className="h-9 w-9 rounded-full bg-brand-navy dark:bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            {user?.profile?.avatarUrl || authUser?.profile?.avatarUrl ? (
              <img
                src={user?.profile?.avatarUrl || authUser?.profile?.avatarUrl!}
                alt={user?.fullName || authUser?.fullName || 'Student'}
                className="w-full h-full object-cover"
              />
            ) : (user?.fullName || authUser?.fullName) ? (
              (user?.fullName || authUser?.fullName)!.charAt(0).toUpperCase()
            ) : (
              'S'
            )}
          </div>
          <div className="overflow-hidden">
            <span className="font-bold text-brand-navy dark:text-slate-100 text-xs truncate block">
              {user?.fullName || 'Student'}
            </span>
            <span className="text-[10px] text-brand-slate dark:text-slate-400 truncate block">
              {user?.email}
            </span>
          </div>
        </Link>

        {/* Links */}
        <nav className="space-y-1">
          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-brand-mint text-brand-emerald dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold'
                    : 'text-brand-slate dark:text-slate-400 hover:text-brand-navy dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive
                      ? 'text-brand-emerald dark:text-emerald-400'
                      : 'text-brand-slate dark:text-slate-400',
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Sign out button */}
      <div className="p-4 border-t border-brand-border dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            handleLinkClick();
            logout();
          }}
          className="w-full justify-start text-xs text-brand-slate dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2 h-9"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
