'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  X,
  ArrowRight,
  User,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  GraduationCap,
  Settings,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useI18n } from '@/context/i18n-context';
import { apiClient } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const { t } = useI18n();

  const navLinks = [
    { href: '/', label: t.home },
    { href: '/courses', label: t.courses },
    { href: '/app/community', label: t.studyGroups },
    { href: '/instructors', label: t.instructors },
    { href: '/pricing', label: t.pricing },
    { href: '/about', label: t.about },
    { href: '/contact', label: t.contact },
  ];

  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>('/users/profile'),
    enabled: !!authUser?.id,
    staleTime: 1000 * 30,
  });

  const user = profileData || authUser;

  // Auto-close on path change & handle escape key
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-border bg-white/95 backdrop-blur-md dark:bg-slate-900/95 dark:border-slate-800 transition-colors">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 shrink-0">
          <img
            src="/logo.png"
            alt="EduVerse Logo"
            className="h-9 w-9 object-contain rounded-lg shadow-xs"
          />
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-brand-coffee dark:text-white text-lg leading-none">
              Edu<span className="text-brand-orange">Verse</span>
            </span>
            <span className="text-[10px] text-brand-slate dark:text-slate-400 tracking-wide font-medium">
              {t.tagline}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'text-brand-orange bg-orange-50 dark:bg-orange-950/60 dark:text-orange-400 font-semibold'
                    : 'text-brand-slate dark:text-slate-300 hover:text-brand-coffee dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center space-x-2.5">
          {/* Language Switcher (English / Amharic) */}
          <LanguageSwitcher />

          {/* Theme Mode Toggle */}
          <ThemeToggle />

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              {(user.role === 'INSTITUTION_ADMIN' || user.role === 'SUPER_ADMIN') && (
                <Link href="/institution">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-brand-orange/40 text-brand-orange hover:bg-orange-50 dark:border-brand-orange/50 dark:text-orange-400 dark:hover:bg-orange-950/50"
                  >
                    <Building2 className="h-4 w-4 text-brand-orange" />
                    <span>{t.institutionPortal}</span>
                  </Button>
                </Link>
              )}

              {user.role === 'SUPER_ADMIN' && (
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                  >
                    <ShieldCheck className="h-4 w-4 text-brand-orange" />
                    <span>{t.admin}</span>
                  </Button>
                </Link>
              )}

              {(user.role === 'TEACHER' ||
                user.role === 'INDEPENDENT_INSTRUCTOR' ||
                user.role === 'SUPER_ADMIN') && (
                <Link href="/teacher/dashboard">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <GraduationCap className="h-4 w-4 text-brand-orange" />
                    <span>{t.studio}</span>
                  </Button>
                </Link>
              )}

              <Link href="/app/dashboard">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <LayoutDashboard className="h-4 w-4 text-brand-coffee dark:text-slate-200" />
                  <span>{t.dashboard}</span>
                </Button>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-brand-border dark:border-slate-800">
                <Link
                  href="/app/profile"
                  className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-950 text-brand-orange dark:text-orange-400 flex items-center justify-center text-xs font-bold border border-brand-orange/20 overflow-hidden hover:ring-2 hover:ring-brand-orange transition-all"
                  title="View Profile"
                >
                  {user?.profile?.avatarUrl || authUser?.profile?.avatarUrl ? (
                    <img
                      src={user?.profile?.avatarUrl || authUser?.profile?.avatarUrl!}
                      alt={user?.fullName || authUser?.fullName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.fullName ? (
                    user.fullName.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-xs text-brand-slate hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 gap-1"
                  title={t.signOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{t.signOut}</span>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t.signIn}
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="orange" size="sm" className="gap-1.5">
                  <span>{t.getStarted}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Header Right Items */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-brand-coffee dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange h-9 w-9 flex items-center justify-center"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-200 shadow-xl">
          {/* User profile snippet when authenticated */}
          {isAuthenticated && user && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-brand-border dark:border-slate-800 flex items-center justify-between gap-3">
              <Link
                href="/app/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 overflow-hidden"
              >
                <div className="h-10 w-10 rounded-full bg-brand-navy dark:bg-slate-700 text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                  {user?.profile?.avatarUrl || authUser?.profile?.avatarUrl ? (
                    <img
                      src={user?.profile?.avatarUrl || authUser?.profile?.avatarUrl!}
                      alt={user?.fullName || authUser?.fullName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.fullName ? (
                    user.fullName.charAt(0).toUpperCase()
                  ) : (
                    'U'
                  )}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-xs text-brand-navy dark:text-slate-100 truncate">
                    {user.fullName || 'User'}
                  </h4>
                  <p className="text-[10px] text-brand-slate dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </Link>
              <span className="text-[10px] font-bold text-brand-orange dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded border border-brand-orange/20 shrink-0">
                {user.role}
              </span>
            </div>
          )}

          {/* Nav Links */}
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'text-brand-orange bg-orange-50 dark:bg-orange-950/60 dark:text-orange-400 font-semibold'
                      : 'text-brand-slate dark:text-slate-300 hover:text-brand-coffee dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Action CTAs */}
          <div className="pt-3 border-t border-brand-border dark:border-slate-800 flex flex-col space-y-2">
            {isAuthenticated && user ? (
              <>
                {(user.role === 'INSTITUTION_ADMIN' || user.role === 'SUPER_ADMIN') && (
                  <Link href="/institution" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-10 border-brand-orange/40 text-brand-orange hover:bg-orange-50 dark:border-brand-orange/50 dark:text-orange-400 dark:hover:bg-orange-950/50"
                    >
                      <Building2 className="h-4 w-4 text-brand-orange" />
                      <span>{t.institutionPortal}</span>
                    </Button>
                  </Link>
                )}

                {user.role === 'SUPER_ADMIN' && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-10"
                    >
                      <ShieldCheck className="h-4 w-4 text-brand-orange" />
                      <span>Administrative Portal</span>
                    </Button>
                  </Link>
                )}

                {(user.role === 'TEACHER' ||
                  user.role === 'INDEPENDENT_INSTRUCTOR' ||
                  user.role === 'SUPER_ADMIN') && (
                  <Link href="/teacher/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start gap-2.5 h-10">
                      <GraduationCap className="h-4 w-4 text-brand-orange" />
                      <span>Instructor Studio</span>
                    </Button>
                  </Link>
                )}

                <Link href="/app/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2.5 h-10">
                    <LayoutDashboard className="h-4 w-4 text-brand-coffee dark:text-slate-200" />
                    <span>Student Dashboard</span>
                  </Button>
                </Link>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link href="/app/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full gap-1.5 h-9 text-xs">
                      <User className="h-3.5 w-3.5" />
                      <span>Profile</span>
                    </Button>
                  </Link>
                  <Link href="/app/settings" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full gap-1.5 h-9 text-xs">
                      <Settings className="h-3.5 w-3.5" />
                      <span>Settings</span>
                    </Button>
                  </Link>
                </div>

                <Button
                  variant="destructive"
                  className="w-full gap-2 h-10 mt-1"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full h-11 text-sm font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="orange" className="w-full h-11 text-sm font-semibold">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
