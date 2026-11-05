'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export function StudentSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 border-r border-brand-border bg-white flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Top: Nav Links */}
      <div className="p-4 space-y-6">
        {/* User Identity Chip */}
        <div className="rounded-lg bg-slate-50 border border-brand-border p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-navy text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            {user?.profile?.avatarUrl ? (
              <img src={user.profile.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : user?.fullName ? (
              user.fullName.charAt(0).toUpperCase()
            ) : (
              'S'
            )}
          </div>
          <div className="overflow-hidden">
            <span className="font-bold text-brand-navy text-xs truncate block">
              {user?.fullName || 'Student'}
            </span>
            <span className="text-[10px] text-brand-slate truncate block">
              {user?.email}
            </span>
          </div>
        </div>

        {/* Links */}
        <nav className="space-y-1">
          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-brand-mint text-brand-emerald font-semibold'
                    : 'text-brand-slate hover:text-brand-navy hover:bg-slate-50',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-emerald' : 'text-brand-slate')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Sign out button */}
      <div className="p-4 border-t border-brand-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="w-full justify-start text-xs text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}

