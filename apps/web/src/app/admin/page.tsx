'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  BookOpen,
  Building2,
  Settings as SettingsIcon,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Eye,
  RefreshCw,
  BarChart3,
  Star,
  Trash2,
  PlusCircle,
  FileCheck2,
} from 'lucide-react';

import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type AdminTab = 'overview' | 'courses' | 'users' | 'reviews' | 'institutions' | 'settings' | 'audit';

export default function AdminPortalPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Modal States
  const [courseReviewModal, setCourseReviewModal] = useState<any | null>(null);
  const [rejectionModalCourse, setRejectionModalCourse] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const [userStatusModal, setUserStatusModal] = useState<{ user: any; action: 'suspend' | 'reactivate' } | null>(null);
  const [userStatusReason, setUserStatusReason] = useState('');
  const [userStatusError, setUserStatusError] = useState<string | null>(null);

  const [reviewModerateModal, setReviewModerateModal] = useState<any | null>(null);
  const [reviewModerateReason, setReviewModerateReason] = useState('');
  const [reviewModerateError, setReviewModerateError] = useState<string | null>(null);

  const [institutionModalOpen, setInstitutionModalOpen] = useState(false);
  const [instName, setInstName] = useState('');
  const [instSlug, setInstSlug] = useState('');
  const [instDomain, setInstDomain] = useState('');
  const [instContactEmail, setInstContactEmail] = useState('');
  const [instError, setInstError] = useState<string | null>(null);

  const [auditDetailModal, setAuditDetailModal] = useState<any | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState('PENDING_REVIEW');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // 1. OVERVIEW DATA
  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => apiClient.get<any>('/admin/overview'),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  // 2. COURSES FOR MODERATION
  const { data: moderationCourses, isLoading: isCoursesLoading } = useQuery({
    queryKey: ['admin-courses-moderation', courseStatusFilter],
    queryFn: () => apiClient.get<any[]>(`/admin/courses/moderation?status=${courseStatusFilter}`),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'courses',
  });

  // 3. USERS FOR MODERATION
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin-users', userSearch, userRoleFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.set('search', userSearch.trim());
      if (userRoleFilter) params.set('role', userRoleFilter);
      return apiClient.get<any>(`/admin/users?${params.toString()}`);
    },
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'users',
  });

  // 4. CONTENT MODERATION (REVIEWS)
  const { data: reviewsData, isLoading: isReviewsLoading, refetch: refetchReviews } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => apiClient.get<any>('/admin/moderation/reviews'),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'reviews',
  });

  // 5. INSTITUTIONS
  const { data: institutions, isLoading: isInstitutionsLoading } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: () => apiClient.get<any[]>('/admin/institutions'),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'institutions',
  });

  // 6. GLOBAL SETTINGS
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => apiClient.get<any>('/admin/settings'),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'settings',
  });

  // 7. AUDIT LOGS
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['admin-audit-logs', auditActionFilter, auditSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (auditActionFilter) params.set('action', auditActionFilter);
      if (auditSearch.trim()) params.set('search', auditSearch.trim());
      params.set('limit', '25');
      return apiClient.get<any>(`/admin/audit-logs?${params.toString()}`);
    },
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'audit',
  });

  // MUTATIONS

  // Course Approval
  const approveCourseMutation = useMutation({
    mutationFn: (courseId: string) =>
      apiClient.patch(`/admin/courses/${courseId}/moderation`, { action: 'APPROVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setCourseReviewModal(null);
    },
  });

  // Course Rejection
  const rejectCourseMutation = useMutation({
    mutationFn: ({ courseId, reason }: { courseId: string; reason: string }) =>
      apiClient.patch(`/admin/courses/${courseId}/moderation`, { action: 'REJECT', reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setRejectionModalCourse(null);
      setRejectionReason('');
      setRejectionError(null);
    },
    onError: (err: any) => {
      setRejectionError(err?.message || 'Failed to reject course');
    },
  });

  // User Status Toggle (Suspend / Reactivate)
  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive, reason }: { userId: string; isActive: boolean; reason?: string }) =>
      apiClient.patch(`/admin/users/${userId}/status`, { isActive, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setUserStatusModal(null);
      setUserStatusReason('');
      setUserStatusError(null);
    },
    onError: (err: any) => {
      setUserStatusError(err?.message || 'Failed to update user status');
    },
  });

  // Review Moderation (Delete Review)
  const moderateReviewMutation = useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      apiClient.delete(`/admin/moderation/reviews/${reviewId}`, {
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setReviewModerateModal(null);
      setReviewModerateReason('');
      setReviewModerateError(null);
    },
    onError: (err: any) => {
      setReviewModerateError(err?.message || 'Failed to moderate review');
    },
  });

  // Create Institution
  const createInstitutionMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; domain?: string; contactEmail: string }) =>
      apiClient.post('/admin/institutions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      setInstitutionModalOpen(false);
      setInstName('');
      setInstSlug('');
      setInstDomain('');
      setInstContactEmail('');
      setInstError(null);
    },
    onError: (err: any) => {
      setInstError(err?.message || 'Failed to create institution');
    },
  });

  // Toggle Institution Status
  const toggleInstitutionStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/admin/institutions/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
    },
  });

  // Update Settings
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) => apiClient.patch('/admin/settings', payload),
    onSuccess: () => {
      setSettingsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setTimeout(() => setSettingsSuccess(false), 3000);
    },
  });

  // Security Gate
  if (isAuthLoading) {
    return (
      <div className="container mx-auto max-w-6xl py-12 px-4 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="container mx-auto max-w-2xl py-16 px-4">
        <Card className="border-red-200 bg-red-50/50 text-center p-8 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-red-900">Restricted Administration Access</CardTitle>
          <CardDescription className="text-red-700">
            The EduVerse Administrative Portal is restricted strictly to platform Super Administrators. Your current role ({user?.role || 'Guest'}) lacks the necessary authorization credentials.
          </CardDescription>
          <div>
            <Link href="/app/dashboard">
              <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-100">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Banner */}
      <div className="border-b border-brand-border bg-white sticky top-16 z-30 shadow-xs">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-navy text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-6 w-6 text-brand-emerald" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-brand-navy">EduVerse Administration</h1>
                <Badge variant="emerald" className="text-[10px]">Super Admin</Badge>
              </div>
              <p className="text-xs text-brand-slate">
                Platform Moderation, User Enforcement, Content Quality & Immutable Audit Trail
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'overview', label: 'KPI Overview', icon: BarChart3 },
              { id: 'courses', label: 'Course Review', icon: BookOpen },
              { id: 'users', label: 'Users & Bans', icon: Users },
              { id: 'reviews', label: 'Content Moderation', icon: Star },
              { id: 'institutions', label: 'Institutions', icon: Building2 },
              { id: 'settings', label: 'Platform Config', icon: SettingsIcon },
              { id: 'audit', label: 'Audit Trail', icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-brand-navy text-white shadow-xs'
                      : 'text-brand-slate hover:text-brand-navy hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* ========================================================================= */}
        {/* 1. OVERVIEW TAB */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Platform Vital Statistics & Telemetry</h2>
                <p className="text-xs text-brand-slate">Live indicators aggregated across PostgreSQL storage engines.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchOverview()} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </Button>
            </div>

            {isOverviewLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-brand-border bg-white shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate uppercase tracking-wider">Total Users</span>
                        <div className="text-2xl font-black text-brand-navy mt-1">{overview.users.total}</div>
                        <span className="text-[11px] text-emerald-600 font-medium">
                          {overview.users.active} Active &bull; {overview.users.suspended} Suspended
                        </span>
                      </div>
                      <div className="p-3 bg-brand-mint text-brand-emerald rounded-xl">
                        <Users className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-brand-border bg-white shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate uppercase tracking-wider">Course Catalog</span>
                        <div className="text-2xl font-black text-brand-navy mt-1">{overview.courses.total}</div>
                        <span className="text-[11px] text-brand-slate">
                          {overview.courses.published} Published &bull; {overview.courses.pendingReview} In Review
                        </span>
                      </div>
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-brand-border bg-white shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate uppercase tracking-wider">Enrollments</span>
                        <div className="text-2xl font-black text-brand-navy mt-1">{overview.enrollments.total}</div>
                        <span className="text-[11px] text-brand-slate">Total Student Course Seats</span>
                      </div>
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <FileCheck2 className="h-5 w-5 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-brand-border bg-white shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate uppercase tracking-wider">Active Tenants</span>
                        <div className="text-2xl font-black text-brand-navy mt-1">{overview.institutions.total}</div>
                        <span className="text-[11px] text-brand-slate">Universities & Colleges</span>
                      </div>
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Building2 className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Diagnostics Box */}
                <Card className="border-brand-border bg-white shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-brand-navy flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>Node.js Runtime & Infrastructure Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-brand-slate block font-medium">Cluster Health</span>
                      <span className="font-bold text-emerald-600 text-sm">{overview.system.status}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-brand-slate block font-medium">Uptime</span>
                      <span className="font-bold text-brand-navy text-sm">{Math.floor(overview.system.uptimeSeconds / 60)} minutes</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-brand-slate block font-medium">Memory Allocation</span>
                      <span className="font-bold text-brand-navy text-sm">{overview.system.memoryUsageMb} MB RSS</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-brand-slate block font-medium">Runtime Engine</span>
                      <span className="font-bold text-brand-navy text-sm">{overview.system.nodeVersion}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. COURSE REVIEW & MODERATION TAB */}
        {/* ========================================================================= */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Instructor Course Moderation Queue</h2>
                <p className="text-xs text-brand-slate">Review submitted course syllabi, verify academic standards, and approve or reject with reasons.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-slate font-medium">Filter Status:</span>
                <select
                  value={courseStatusFilter}
                  onChange={(e) => setCourseStatusFilter(e.target.value)}
                  className="rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy shadow-xs focus:outline-none"
                >
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft / Revisions</option>
                </select>
              </div>
            </div>

            {isCoursesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : moderationCourses && moderationCourses.length > 0 ? (
              <div className="space-y-3">
                {moderationCourses.map((c) => (
                  <Card key={c.id} className="border-brand-border bg-white shadow-xs hover:border-brand-navy/30 transition-colors">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-brand-navy text-sm">{c.title}</h3>
                          <Badge variant={c.status === 'PUBLISHED' ? 'emerald' : c.status === 'PENDING_REVIEW' ? 'outline' : 'secondary'} className="text-[10px]">
                            {c.status}
                          </Badge>
                          {c.category && (
                            <Badge variant="outline" className="text-[10px] bg-slate-50">
                              {c.category.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-brand-slate">
                          Instructor: <span className="font-semibold text-brand-navy">{c.author.fullName}</span> ({c.author.email}) &bull; {c._count?.sections || 0} Sections &bull; {c._count?.enrollments || 0} Learners
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const details = await apiClient.get<any>(`/admin/courses/${c.id}/review`);
                            setCourseReviewModal(details);
                          }}
                          className="gap-1.5 text-xs h-8"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect Syllabus</span>
                        </Button>

                        {c.status !== 'PUBLISHED' && (
                          <Button
                            variant="emerald"
                            size="sm"
                            disabled={approveCourseMutation.isPending}
                            onClick={() => approveCourseMutation.mutate(c.id)}
                            className="gap-1.5 text-xs h-8"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </Button>
                        )}

                        {c.status !== 'DRAFT' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setRejectionModalCourse(c);
                              setRejectionReason('');
                              setRejectionError(null);
                            }}
                            className="gap-1.5 text-xs h-8"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No Courses in this Queue"
                description={`There are currently no courses matching the "${courseStatusFilter}" moderation status filter.`}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. USERS MODERATION TAB */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">User Enforcement & Account Status</h2>
                <p className="text-xs text-brand-slate">Suspend bad actors, restore rehabilitated accounts, and revoke active login tokens.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-slate" />
                  <Input
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 text-xs h-8 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-lg border border-brand-border bg-white px-3 py-1 text-xs font-semibold text-brand-navy h-8 shadow-xs focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="INSTITUTION_ADMIN">Institution Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            {isUsersLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : usersData?.users && usersData.users.length > 0 ? (
              <div className="border border-brand-border bg-white rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-brand-border text-brand-slate font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Activity</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60">
                      {usersData.users.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-brand-navy block">{u.fullName}</span>
                            <span className="text-[11px] text-brand-slate block">{u.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {u.isActive ? (
                              <Badge variant="emerald" className="text-[10px]">Active</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-brand-slate text-[11px]">
                            {u._count.enrollments} enrollments &bull; {u._count.authoredCourses} courses
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.role !== 'SUPER_ADMIN' ? (
                              u.isActive ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setUserStatusModal({ user: u, action: 'suspend' });
                                    setUserStatusReason('');
                                    setUserStatusError(null);
                                  }}
                                  className="text-xs h-7 px-2.5"
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  variant="emerald"
                                  size="sm"
                                  onClick={() => {
                                    setUserStatusModal({ user: u, action: 'reactivate' });
                                    setUserStatusReason('');
                                    setUserStatusError(null);
                                  }}
                                  className="text-xs h-7 px-2.5"
                                >
                                  Reactivate
                                </Button>
                              )
                            ) : (
                              <span className="text-[10px] text-brand-slate italic">Protected Admin</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No Users Found"
                description="No users matched your current query criteria."
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. CONTENT MODERATION (REVIEWS) TAB */}
        {/* ========================================================================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">User Reviews Moderation</h2>
                <p className="text-xs text-brand-slate">Purge inappropriate comments, abusive language, or promotional spam.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchReviews()} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </Button>
            </div>

            {isReviewsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
              <div className="space-y-3">
                {reviewsData.reviews.map((r: any) => (
                  <Card key={r.id} className="border-brand-border bg-white shadow-xs">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-navy text-xs">{r.user.fullName}</span>
                          <span className="text-[10px] text-brand-slate">on &ldquo;{r.course.title}&rdquo;</span>
                          <div className="flex items-center text-amber-500 gap-0.5">
                            {[...Array(r.rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-brand-navy/90 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                          &ldquo;{r.comment || 'No written text'}&rdquo;
                        </p>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setReviewModerateModal(r);
                          setReviewModerateReason('');
                          setReviewModerateError(null);
                        }}
                        className="gap-1.5 text-xs h-8 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove Review</span>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="No Reviews Found"
                description="The review moderation queue has no pending items."
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. INSTITUTIONS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'institutions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Institutional Tenants & Universities</h2>
                <p className="text-xs text-brand-slate">Configure higher-education universities, academic domains, and multi-tenant quotas.</p>
              </div>

              <Button
                variant="emerald"
                size="sm"
                onClick={() => setInstitutionModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Onboard Institution</span>
              </Button>
            </div>

            {isInstitutionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : institutions && institutions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {institutions.map((inst: any) => (
                  <Card key={inst.id} className="border-brand-border bg-white shadow-xs">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-brand-navy">{inst.name}</CardTitle>
                        <CardDescription className="text-xs font-mono">{inst.slug}.eduverse.et</CardDescription>
                      </div>
                      <Badge variant={inst.isActive ? 'emerald' : 'destructive'} className="text-[10px]">
                        {inst.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg text-center">
                        <div>
                          <span className="font-bold text-brand-navy block text-sm">{inst._count?.members || 0}</span>
                          <span className="text-[10px] text-brand-slate">Members</span>
                        </div>
                        <div>
                          <span className="font-bold text-brand-navy block text-sm">{inst._count?.departments || 0}</span>
                          <span className="text-[10px] text-brand-slate">Depts</span>
                        </div>
                        <div>
                          <span className="font-bold text-brand-navy block text-sm">{inst._count?.courses || 0}</span>
                          <span className="text-[10px] text-brand-slate">Courses</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-brand-slate text-[11px] truncate max-w-[200px]">Contact: {inst.contactEmail}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleInstitutionStatusMutation.mutate({ id: inst.id, isActive: !inst.isActive })}
                          className="text-xs h-7"
                        >
                          {inst.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No Institutions Configured"
                description="Click 'Onboard Institution' to register higher education universities."
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. PLATFORM SETTINGS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-brand-navy">Global Platform Runtime Configuration</h2>
              <p className="text-xs text-brand-slate">Tune moderation requirements, maintenance modes, and systemic parameters.</p>
            </div>

            {settingsSuccess && (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Configuration Saved</AlertTitle>
                <AlertDescription>Platform settings updated and logged to the audit stream.</AlertDescription>
              </Alert>
            )}

            {isSettingsLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <Card className="border-brand-border bg-white shadow-xs">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-brand-navy">Platform Name</Label>
                    <Input
                      defaultValue={settings?.platformName}
                      id="platformNameInput"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-brand-navy">Support Email</Label>
                    <Input
                      defaultValue={settings?.supportEmail}
                      id="supportEmailInput"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-brand-navy">Max Upload Size (MB)</Label>
                    <Input
                      type="number"
                      defaultValue={settings?.maxUploadSizeMb}
                      id="maxUploadInput"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-brand-navy block">Require Administrative Course Approval</Label>
                      <span className="text-[11px] text-brand-slate">Courses must be approved by Super Admin before publication</span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={settings?.requireCourseApproval}
                      id="requireApprovalInput"
                      className="h-4 w-4 text-brand-emerald rounded border-slate-300"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-brand-navy block">Maintenance Mode</Label>
                      <span className="text-[11px] text-brand-slate">Temporarily restrict access for scheduled upgrades</span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={settings?.maintenanceMode}
                      id="maintenanceModeInput"
                      className="h-4 w-4 text-brand-emerald rounded border-slate-300"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      variant="emerald"
                      size="sm"
                      disabled={updateSettingsMutation.isPending}
                      onClick={() => {
                        const platformName = (document.getElementById('platformNameInput') as HTMLInputElement).value;
                        const supportEmail = (document.getElementById('supportEmailInput') as HTMLInputElement).value;
                        const maxUploadSizeMb = Number((document.getElementById('maxUploadInput') as HTMLInputElement).value);
                        const requireCourseApproval = (document.getElementById('requireApprovalInput') as HTMLInputElement).checked;
                        const maintenanceMode = (document.getElementById('maintenanceModeInput') as HTMLInputElement).checked;

                        updateSettingsMutation.mutate({
                          platformName,
                          supportEmail,
                          maxUploadSizeMb,
                          requireCourseApproval,
                          maintenanceMode,
                        });
                      }}
                      className="text-xs h-9 px-4"
                    >
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. AUDIT TRAIL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Immutable Audit Trail & Forensics</h2>
                <p className="text-xs text-brand-slate">Tamper-proof event logs detailing administrative mutations, sanitized metadata, and outcomes.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-slate" />
                  <Input
                    placeholder="Search action or entity..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-8 text-xs h-8 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="rounded-lg border border-brand-border bg-white px-3 py-1 text-xs font-semibold text-brand-navy h-8 shadow-xs focus:outline-none"
                >
                  <option value="">All Actions</option>
                  <option value="USER_ACCOUNT_SUSPENDED">Suspensions</option>
                  <option value="USER_ACCOUNT_REACTIVATED">Reactivations</option>
                  <option value="COURSE_APPROVED">Course Approvals</option>
                  <option value="COURSE_REJECTED">Course Rejections</option>
                  <option value="REVIEW_MODERATED">Review Moderations</option>
                  <option value="PLATFORM_SETTINGS_UPDATED">Settings Updates</option>
                </select>
              </div>
            </div>

            {isAuditLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : auditData?.logs && auditData.logs.length > 0 ? (
              <div className="border border-brand-border bg-white rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-brand-border text-brand-slate font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Target Resource</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Forensic Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60">
                      {auditData.logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-brand-navy">
                            <span className="p-1 rounded bg-slate-100 text-[10px] border border-slate-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-brand-navy block">{log.user?.fullName || 'System Root'}</span>
                            <span className="text-[10px] text-brand-slate block">{log.user?.email || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4 text-brand-slate font-mono text-[11px]">
                            {log.entityType}: {log.entityId?.slice(0, 8)}...
                          </td>
                          <td className="py-3 px-4 text-brand-slate text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAuditDetailModal(log)}
                              className="text-[11px] h-7 px-2"
                            >
                              Inspect Meta
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={History}
                title="No Audit Records"
                description="No system audit logs matched the filter criteria."
              />
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Inspect Curriculum Modal */}
      {courseReviewModal && (
        <Dialog open={Boolean(courseReviewModal)} onOpenChange={() => setCourseReviewModal(null)}>
          <div className="max-h-[80vh] overflow-y-auto space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-brand-navy">
                Curriculum Review: {courseReviewModal.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Instructor: {courseReviewModal.author?.fullName} &bull; Difficulty: {courseReviewModal.difficulty} &bull; Language: {courseReviewModal.language}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-brand-navy block mb-1">Course Description:</span>
                <p className="text-brand-slate whitespace-pre-wrap">{courseReviewModal.description}</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-brand-navy text-sm block">Syllabus Breakdown ({courseReviewModal.sections?.length || 0} Sections)</span>
                {courseReviewModal.sections?.map((sec: any, idx: number) => (
                  <div key={sec.id} className="border border-brand-border rounded-lg p-3 space-y-2 bg-white">
                    <div className="font-semibold text-brand-navy">
                      Section {idx + 1}: {sec.title} ({sec.lessons?.length || 0} lessons)
                    </div>
                    <ul className="pl-4 list-disc space-y-1 text-brand-slate">
                      {sec.lessons?.map((les: any) => (
                        <li key={les.id}>
                          <span className="font-medium text-brand-navy">{les.title}</span> ({les.durationMinutes} min, {les.type})
                          {les.quiz && <Badge variant="outline" className="ml-2 text-[9px] bg-amber-50">Quiz Attached</Badge>}
                          {les.assignment && <Badge variant="outline" className="ml-2 text-[9px] bg-purple-50">Assignment Attached</Badge>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setCourseReviewModal(null)}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setRejectionModalCourse(courseReviewModal);
                    setCourseReviewModal(null);
                  }}
                >
                  Reject with Reason
                </Button>
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => approveCourseMutation.mutate(courseReviewModal.id)}
                >
                  Approve & Publish
                </Button>
              </div>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 2. Rejection Reason Modal */}
      {rejectionModalCourse && (
        <Dialog open={Boolean(rejectionModalCourse)} onOpenChange={() => setRejectionModalCourse(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-navy">
              Reject Course: {rejectionModalCourse.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              A clear rejection reason is mandatory. The author will be notified to make revisions.
            </DialogDescription>
          </DialogHeader>

          {rejectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{rejectionError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-brand-navy">Rejection Feedback / Justification *</Label>
            <Textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete syllabus in Section 2, missing practical assignments, or audio quality issues..."
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRejectionModalCourse(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectionReason.trim() || rejectCourseMutation.isPending}
              onClick={() =>
                rejectCourseMutation.mutate({
                  courseId: rejectionModalCourse.id,
                  reason: rejectionReason.trim(),
                })
              }
            >
              Submit Rejection
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 3. User Status Modal */}
      {userStatusModal && (
        <Dialog open={Boolean(userStatusModal)} onOpenChange={() => setUserStatusModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-navy">
              {userStatusModal.action === 'suspend' ? 'Suspend User Account' : 'Reactivate User Account'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Target: {userStatusModal.user.fullName} ({userStatusModal.user.email})
            </DialogDescription>
          </DialogHeader>

          {userStatusError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{userStatusError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-brand-navy">
              {userStatusModal.action === 'suspend' ? 'Suspension Reason *' : 'Reactivation Reason'}
            </Label>
            <Textarea
              rows={3}
              value={userStatusReason}
              onChange={(e) => setUserStatusReason(e.target.value)}
              placeholder={
                userStatusModal.action === 'suspend'
                  ? 'State the policy violation reason (e.g. academic misconduct, spam)...'
                  : 'Notes regarding account reinstatement...'
              }
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setUserStatusModal(null)}>
              Cancel
            </Button>
            <Button
              variant={userStatusModal.action === 'suspend' ? 'destructive' : 'emerald'}
              size="sm"
              disabled={updateUserStatusMutation.isPending}
              onClick={() =>
                updateUserStatusMutation.mutate({
                  userId: userStatusModal.user.id,
                  isActive: userStatusModal.action === 'reactivate',
                  reason: userStatusReason.trim(),
                })
              }
            >
              Confirm {userStatusModal.action === 'suspend' ? 'Suspension' : 'Reactivation'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 4. Review Moderation Modal */}
      {reviewModerateModal && (
        <Dialog open={Boolean(reviewModerateModal)} onOpenChange={() => setReviewModerateModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-navy">
              Remove Inappropriate Review
            </DialogTitle>
            <DialogDescription className="text-xs">
              Author: {reviewModerateModal.user.fullName} &bull; Rating: {reviewModerateModal.rating} stars
            </DialogDescription>
          </DialogHeader>

          {reviewModerateError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{reviewModerateError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 py-2">
            <div className="p-2.5 bg-slate-50 border rounded-md text-xs italic">
              &ldquo;{reviewModerateModal.comment}&rdquo;
            </div>
            <Label className="text-xs font-semibold text-brand-navy">Removal Reason *</Label>
            <Input
              value={reviewModerateReason}
              onChange={(e) => setReviewModerateReason(e.target.value)}
              placeholder="Reason for removal (e.g. vulgarity, harassment, spam)..."
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setReviewModerateModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!reviewModerateReason.trim() || moderateReviewMutation.isPending}
              onClick={() =>
                moderateReviewMutation.mutate({
                  reviewId: reviewModerateModal.id,
                  reason: reviewModerateReason.trim(),
                })
              }
            >
              Delete Review
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 5. Create Institution Modal */}
      {institutionModalOpen && (
        <Dialog open={institutionModalOpen} onOpenChange={() => setInstitutionModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-navy">
              Onboard New Higher-Education Tenant
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a university or college institutional tenant with isolated departments.
            </DialogDescription>
          </DialogHeader>

          {instError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{instError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="font-semibold text-brand-navy">Institution Name *</Label>
              <Input
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                placeholder="e.g. Addis Ababa University"
                className="text-xs h-8"
              />
            </div>

            <div>
              <Label className="font-semibold text-brand-navy">Slug Code *</Label>
              <Input
                value={instSlug}
                onChange={(e) => setInstSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. aau"
                className="text-xs h-8 font-mono"
              />
            </div>

            <div>
              <Label className="font-semibold text-brand-navy">Official Domain (Optional)</Label>
              <Input
                value={instDomain}
                onChange={(e) => setInstDomain(e.target.value.toLowerCase())}
                placeholder="e.g. aau.edu.et"
                className="text-xs h-8 font-mono"
              />
            </div>

            <div>
              <Label className="font-semibold text-brand-navy">Contact Email *</Label>
              <Input
                value={instContactEmail}
                onChange={(e) => setInstContactEmail(e.target.value)}
                placeholder="e.g. administration@aau.edu.et"
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setInstitutionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="emerald"
              size="sm"
              disabled={!instName.trim() || !instSlug.trim() || !instContactEmail.trim() || createInstitutionMutation.isPending}
              onClick={() =>
                createInstitutionMutation.mutate({
                  name: instName.trim(),
                  slug: instSlug.trim(),
                  domain: instDomain.trim() || undefined,
                  contactEmail: instContactEmail.trim(),
                })
              }
            >
              Create Institution
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 6. Forensic Metadata Modal */}
      {auditDetailModal && (
        <Dialog open={Boolean(auditDetailModal)} onOpenChange={() => setAuditDetailModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-navy">
              Audit Record Forensics: {auditDetailModal.action}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              Log ID: {auditDetailModal.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
              <div><span className="font-semibold text-brand-navy">Actor:</span> {auditDetailModal.user?.fullName} ({auditDetailModal.user?.email || 'N/A'})</div>
              <div><span className="font-semibold text-brand-navy">Target Resource:</span> {auditDetailModal.entityType} ({auditDetailModal.entityId})</div>
              <div><span className="font-semibold text-brand-navy">Timestamp:</span> {new Date(auditDetailModal.createdAt).toISOString()}</div>
            </div>

            <div>
              <span className="font-semibold text-brand-navy block mb-1">Sanitized Metadata Payload:</span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56">
                {JSON.stringify(auditDetailModal.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAuditDetailModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
