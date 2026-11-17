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
  BookOpenCheck,
  StickyNote,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useI18n } from '@/context/i18n-context';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface StudentSidebarProps {
  onNavigate?: () => void;
}

export function StudentSidebar({ onNavigate }: StudentSidebarProps) {
  const pathname = usePathname();
  const { user: authUser, logout } = useAuth();
  const { t } = useI18n();

  const studentNavItems = [
    { href: '/app/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { href: '/app/courses', label: t.myCourses, icon: BookOpen },
    { href: '/app/ai-tutor', label: t.aiStudyTutor, icon: BookOpenCheck },
    { href: '/app/notes', label: t.studyNotebook, icon: StickyNote },
    { href: '/app/community', label: t.studyGroups, icon: Users },
    { href: '/app/progress', label: t.learningProgress, icon: TrendingUp },
    { href: '/app/recent-lessons', label: t.recentLessons, icon: History },
    { href: '/app/assignments', label: t.assignments, icon: FileCheck2 },
    { href: '/app/quizzes', label: t.quizHistory, icon: HelpCircle },
    { href: '/app/certificates', label: t.certificates, icon: Award },
    { href: '/app/notifications', label: t.notifications, icon: Bell },
    { href: '/app/profile', label: t.studentProfile, icon: User },
    { href: '/app/settings', label: t.accountSettings, icon: Settings },
  ];

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
    <aside className="w-64 border-r border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] transition-colors">
      {/* Top: Nav Links */}
      <div className="p-4 space-y-6">
        {/* User Identity Chip */}
        <Link
          href="/app/profile"
          onClick={handleLinkClick}
          className="rounded-lg bg-brand-creamy/60 dark:bg-stone-800/70 border border-brand-border dark:border-stone-800 p-3 flex items-center gap-3 hover:border-brand-orange/40 transition-colors block"
        >
          <div className="h-9 w-9 rounded-full bg-brand-coffee text-white dark:bg-stone-700 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
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
            <span className="font-bold text-brand-coffee dark:text-stone-100 text-xs truncate block">
              {user?.fullName || 'Student'}
            </span>
            <span className="text-[10px] text-brand-slate dark:text-stone-400 truncate block">
              {user?.email}
            </span>
          </div>
        </Link>

        {/* Links */}
        <nav className="space-y-1">
          {studentNavItems.map((item) => {
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
                    ? 'bg-orange-50 text-brand-orange dark:bg-orange-950/50 dark:text-orange-400 font-bold border-l-2 border-brand-orange'
                    : 'text-brand-coffee/80 dark:text-stone-400 hover:text-brand-orange dark:hover:text-stone-100 hover:bg-orange-50/40 dark:hover:bg-stone-800',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive
                      ? 'text-brand-orange dark:text-orange-400'
                      : 'text-stone-400 dark:text-stone-500',
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Sign out button */}
      <div className="p-4 border-t border-brand-border dark:border-stone-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            handleLinkClick();
            logout();
          }}
          className="w-full justify-start text-xs text-brand-slate dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2 h-9"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t.signOut}</span>
        </Button>
      </div>
    </aside>
  );
}
