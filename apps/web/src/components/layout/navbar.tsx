'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Menu, X, ArrowRight, User, LogOut, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/courses', label: 'Courses' },
  { href: '/instructors', label: 'Instructors' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user: authUser, isAuthenticated, logout } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>('/users/profile'),
    enabled: !!authUser?.id,
    staleTime: 1000 * 30,
  });

  const user = profileData || authUser;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-border bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5">
          <img
            src="/logo.png"
            alt="EduVerse Logo"
            className="h-9 w-9 object-contain rounded-lg shadow-xs"
          />
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-brand-navy text-lg leading-none">
              Edu<span className="text-brand-emerald">Verse</span>
            </span>
            <span className="text-[10px] text-brand-slate tracking-wide font-medium">
              Learn Beyond Boundaries
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'text-brand-emerald bg-brand-mint font-semibold'
                    : 'text-brand-slate hover:text-brand-navy hover:bg-slate-50',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              {user.role === 'SUPER_ADMIN' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span>Admin</span>
                  </Button>
                </Link>
              )}

              {(user.role === 'TEACHER' || user.role === 'INDEPENDENT_INSTRUCTOR' || user.role === 'SUPER_ADMIN') && (
                <Link href="/teacher/dashboard">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Sparkles className="h-4 w-4 text-brand-emerald" />
                    <span>Studio</span>
                  </Button>
                </Link>
              )}

              <Link href="/app/dashboard">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <LayoutDashboard className="h-4 w-4 text-brand-navy" />
                  <span>Dashboard</span>
                </Button>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-brand-border">
                <div className="h-8 w-8 rounded-full bg-brand-mint text-brand-emerald flex items-center justify-center text-xs font-bold border border-brand-emerald/20 overflow-hidden">
                  {user.profile?.avatarUrl ? (
                    <img src={user.profile.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : user.fullName ? (
                    user.fullName.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-xs text-brand-slate hover:text-red-600 gap-1"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="emerald" size="sm" className="gap-1.5">
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-brand-navy hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-emerald"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-brand-border bg-white px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3 py-2 rounded-md text-base font-medium transition-colors',
                    isActive
                      ? 'text-brand-emerald bg-brand-mint font-semibold'
                      : 'text-brand-slate hover:text-brand-navy hover:bg-slate-50',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="pt-4 border-t border-brand-border flex flex-col space-y-2">
            {isAuthenticated && user ? (
              <>
                {user.role === 'SUPER_ADMIN' && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full gap-2 border-purple-200 text-purple-700">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                      <span>Administrative Portal</span>
                    </Button>
                  </Link>
                )}

                {(user.role === 'TEACHER' || user.role === 'INDEPENDENT_INSTRUCTOR' || user.role === 'SUPER_ADMIN') && (
                  <Link href="/teacher/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full gap-2">
                      <Sparkles className="h-4 w-4 text-brand-emerald" />
                      <span>Instructor Studio</span>
                    </Button>
                  </Link>
                )}

                <Link href="/app/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full gap-2">
                    <LayoutDashboard className="h-4 w-4 text-brand-navy" />
                    <span>Student Dashboard</span>
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
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
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="emerald" className="w-full">
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
