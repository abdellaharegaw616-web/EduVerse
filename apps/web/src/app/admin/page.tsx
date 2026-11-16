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
  Layers,
  Edit,
  UserCheck,
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

type AdminTab = 'overview' | 'courses' | 'users' | 'categories' | 'reviews' | 'institutions' | 'settings' | 'audit';

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

  const [userRoleModal, setUserRoleModal] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('STUDENT');
  const [userRoleError, setUserRoleError] = useState<string | null>(null);

  const [categoryModal, setCategoryModal] = useState<{ isEditing: boolean; category?: any } | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [deleteCategoryModal, setDeleteCategoryModal] = useState<any | null>(null);

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
  const [categorySearch, setCategorySearch] = useState('');
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
      if (userSearch) params.append('search', userSearch);
      if (userRoleFilter) params.append('role', userRoleFilter);
      return apiClient.get<any>(`/admin/users?${params.toString()}`);
    },
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'users',
  });

  // 4. CATEGORIES LIST
  const { data: categories = [], isLoading: isCategoriesLoading, refetch: refetchCategories } = useQuery<any[]>({
    queryKey: ['admin-categories'],
    queryFn: () => apiClient.get<any[]>('/admin/categories'),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'categories',
  });

  // 5. REVIEWS FOR MODERATION
  const { data: reviewsData, isLoading: isReviewsLoading, refetch: refetchReviews } = useQuery({
    queryKey: ['admin-reviews-moderation'],
    queryFn: () => apiClient.get<any>('/admin/moderation/reviews'),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'reviews',
  });

  // 6. INSTITUTIONS
  const { data: institutions, isLoading: isInstitutionsLoading } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: () => apiClient.get<any[]>('/admin/institutions'),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'institutions',
  });

  // 7. SETTINGS
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => apiClient.get<any>('/admin/settings'),
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'settings',
  });

  // 8. AUDIT LOGS
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['admin-audit-logs', auditActionFilter, auditSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (auditActionFilter) params.append('action', auditActionFilter);
      if (auditSearch) params.append('entityType', auditSearch);
      return apiClient.get<any>(`/admin/audit-logs?${params.toString()}`);
    },
    enabled: user?.role === 'SUPER_ADMIN' && activeTab === 'audit',
  });

  // =========================================================================
  // MUTATIONS
  // =========================================================================

  // Approve Course
  const approveCourseMutation = useMutation({
    mutationFn: (courseId: string) =>
      apiClient.patch(`/admin/courses/${courseId}/moderation`, { action: 'APPROVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setCourseReviewModal(null);
    },
  });

  // Reject Course
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

  // Suspend / Reactivate User
  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive, reason }: { userId: string; isActive: boolean; reason: string }) =>
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

  // Change User Role
  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setUserRoleModal(null);
      setUserRoleError(null);
    },
    onError: (err: any) => {
      setUserRoleError(err?.message || 'Failed to update user role');
    },
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (dto: { name: string; description?: string }) =>
      apiClient.post('/admin/categories', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setCategoryModal(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryError(null);
    },
    onError: (err: any) => {
      setCategoryError(err?.message || 'Failed to create category');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name?: string; description?: string } }) =>
      apiClient.patch(`/admin/categories/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setCategoryModal(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryError(null);
    },
    onError: (err: any) => {
      setCategoryError(err?.message || 'Failed to update category');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setDeleteCategoryModal(null);
    },
  });

  // Moderate Review
  const moderateReviewMutation = useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      apiClient.delete(`/admin/moderation/reviews/${reviewId}`, {
        body: JSON.stringify({ reason }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-moderation'] });
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
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 text-center p-8 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-red-900 dark:text-red-300">Restricted Administration Access</CardTitle>
          <CardDescription className="text-red-700 dark:text-red-400">
            The EduVerse Administrative Portal is restricted strictly to platform Super Administrators. Your current role ({user?.role || 'Guest'}) lacks administrative credentials.
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

  const filteredCategories = categories.filter((cat: any) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.slug.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-stone-950 pb-20">
      {/* Top Banner */}
      <div className="border-b border-[#2A1B14] bg-[#19100C] text-white sticky top-16 z-30 shadow-md">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-600/20 border border-orange-500/30 text-brand-orange flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">EduVerse Administration</h1>
                <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-[10px] font-bold">
                  Super Admin
                </Badge>
              </div>
              <p className="text-xs text-stone-300">
                Platform Moderation, User Role Enforcement, Quality Approvals & Immutable Audit Trail
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'overview', label: 'KPI Overview', icon: BarChart3 },
              { id: 'courses', label: 'Course Review', icon: BookOpen },
              { id: 'users', label: 'Users & Roles', icon: Users },
              { id: 'categories', label: 'Categories', icon: Layers },
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
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800'
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
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">Platform Vital Statistics & Telemetry</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">Live indicators aggregated across PostgreSQL storage engines.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchOverview()}
                className="gap-1.5 text-xs border-brand-border dark:border-stone-700 hover:border-brand-orange/40"
              >
                <RefreshCw className="h-3.5 w-3.5 text-brand-orange" />
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
                  <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate dark:text-stone-400 uppercase tracking-wider">Total Users</span>
                        <div className="text-2xl font-black text-brand-coffee dark:text-stone-100 mt-1 font-mono">{overview.users.total}</div>
                        <span className="text-[11px] text-brand-orange font-medium">
                          {overview.users.active} Active &bull; {overview.users.suspended} Suspended
                        </span>
                      </div>
                      <div className="p-3 bg-orange-100 text-brand-orange dark:bg-orange-950/50 rounded-xl">
                        <Users className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate dark:text-stone-400 uppercase tracking-wider">Course Catalog</span>
                        <div className="text-2xl font-black text-brand-coffee dark:text-stone-100 mt-1 font-mono">{overview.courses.total}</div>
                        <span className="text-[11px] text-brand-slate dark:text-stone-400">
                          {overview.courses.published} Published &bull; {overview.courses.pendingReview} In Review
                        </span>
                      </div>
                      <div className="p-3 bg-orange-100 text-brand-orange dark:bg-orange-950/50 rounded-xl">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate dark:text-stone-400 uppercase tracking-wider">Enrollments</span>
                        <div className="text-2xl font-black text-brand-coffee dark:text-stone-100 mt-1 font-mono">{overview.enrollments.total}</div>
                        <span className="text-[11px] text-brand-slate dark:text-stone-400">Total Student Seats</span>
                      </div>
                      <div className="p-3 bg-orange-100 text-brand-orange dark:bg-orange-950/50 rounded-xl">
                        <FileCheck2 className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-brand-slate dark:text-stone-400 uppercase tracking-wider">Active Tenants</span>
                        <div className="text-2xl font-black text-brand-coffee dark:text-stone-100 mt-1 font-mono">{overview.institutions.total}</div>
                        <span className="text-[11px] text-brand-slate dark:text-stone-400">Universities & Colleges</span>
                      </div>
                      <div className="p-3 bg-orange-100 text-brand-orange dark:bg-orange-950/50 rounded-xl">
                        <Building2 className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Diagnostics Box */}
                <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                  <CardHeader className="pb-3 border-b border-brand-border dark:border-stone-800">
                    <CardTitle className="text-sm font-bold text-brand-coffee dark:text-stone-100 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-orange" />
                      <span>Node.js Runtime & Infrastructure Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-4">
                    <div className="p-3 bg-brand-creamy dark:bg-stone-800/60 rounded-xl border border-brand-border dark:border-stone-700">
                      <span className="text-brand-slate dark:text-stone-400 block font-medium">Cluster Health</span>
                      <span className="font-bold text-brand-orange text-sm">{overview.system.status}</span>
                    </div>
                    <div className="p-3 bg-brand-creamy dark:bg-stone-800/60 rounded-xl border border-brand-border dark:border-stone-700">
                      <span className="text-brand-slate dark:text-stone-400 block font-medium">Uptime</span>
                      <span className="font-bold text-brand-coffee dark:text-stone-100 text-sm font-mono">{Math.floor(overview.system.uptimeSeconds / 60)} minutes</span>
                    </div>
                    <div className="p-3 bg-brand-creamy dark:bg-stone-800/60 rounded-xl border border-brand-border dark:border-stone-700">
                      <span className="text-brand-slate dark:text-stone-400 block font-medium">Memory Allocation</span>
                      <span className="font-bold text-brand-coffee dark:text-stone-100 text-sm font-mono">{overview.system.memoryUsageMb} MB RSS</span>
                    </div>
                    <div className="p-3 bg-brand-creamy dark:bg-stone-800/60 rounded-xl border border-brand-border dark:border-stone-700">
                      <span className="text-brand-slate dark:text-stone-400 block font-medium">Runtime Engine</span>
                      <span className="font-bold text-brand-coffee dark:text-stone-100 text-sm font-mono">{overview.system.nodeVersion}</span>
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
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">Instructor Course Moderation Queue</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">Review submitted course syllabi, verify academic standards, and approve or reject with actionable feedback.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-slate dark:text-stone-400 font-medium">Filter Status:</span>
                <select
                  value={courseStatusFilter}
                  onChange={(e) => setCourseStatusFilter(e.target.value)}
                  className="rounded-lg border border-brand-border dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-brand-coffee dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-orange"
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
                  <Card key={c.id} className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:border-brand-orange/40 transition-colors">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-brand-coffee dark:text-stone-100 text-sm">{c.title}</h3>
                          <Badge variant="outline" className={`text-[10px] ${
                            c.status === 'PUBLISHED'
                              ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {c.status}
                          </Badge>
                          {c.category && (
                            <Badge variant="outline" className="text-[10px] bg-brand-creamy dark:bg-stone-800 text-brand-coffee dark:text-stone-200">
                              {c.category.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-brand-slate dark:text-stone-400">
                          Instructor: <span className="font-semibold text-brand-coffee dark:text-stone-200">{c.author.fullName}</span> ({c.author.email}) &bull; {c._count?.sections || 0} Sections &bull; {c._count?.enrollments || 0} Learners
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const detail = await apiClient.get(`/admin/courses/${c.id}/review`);
                            setCourseReviewModal(detail);
                          }}
                          className="gap-1.5 text-xs h-8 border-brand-border dark:border-stone-700 hover:border-brand-orange/40"
                        >
                          <Eye className="h-3.5 w-3.5 text-brand-orange" />
                          <span>Inspect Syllabus</span>
                        </Button>

                        {c.status !== 'PUBLISHED' && (
                          <Button
                            variant="orange"
                            size="sm"
                            disabled={approveCourseMutation.isPending}
                            onClick={() => approveCourseMutation.mutate(c.id)}
                            className="gap-1.5 text-xs h-8 shadow-sm"
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
        {/* 3. USERS & ROLES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">User Enforcement & Role Management</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">Suspend bad actors, promote verified instructors, and manage account statuses.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-slate" />
                  <Input
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 text-xs h-8 w-48 sm:w-60 border-brand-border dark:border-stone-700"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-lg border border-brand-border dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-brand-coffee dark:text-stone-100 h-8 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="INDEPENDENT_INSTRUCTOR">Instructor</option>
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
              <div className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F2] dark:bg-stone-800 border-b border-brand-border dark:border-stone-700 text-brand-coffee dark:text-stone-300 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Activity</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60 dark:divide-stone-800">
                      {usersData.users.map((u: any) => (
                        <tr key={u.id} className="hover:bg-orange-50/20 dark:hover:bg-stone-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-brand-coffee dark:text-stone-100 block">{u.fullName}</span>
                            <span className="text-[11px] text-brand-slate dark:text-stone-400 block">{u.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] bg-brand-creamy dark:bg-stone-800 font-mono text-brand-coffee dark:text-stone-200">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {u.isActive ? (
                              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-brand-slate dark:text-stone-400 text-[11px]">
                            {u._count.enrollments} enrollments &bull; {u._count.authoredCourses} courses
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUserRoleModal(u);
                                setSelectedRole(u.role);
                                setUserRoleError(null);
                              }}
                              className="text-xs h-7 px-2 border-brand-border dark:border-stone-700 hover:border-brand-orange/40"
                            >
                              <UserCheck className="h-3 w-3 mr-1 text-brand-orange" />
                              <span>Role</span>
                            </Button>

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
                                  variant="orange"
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
        {/* 4. CATEGORIES MANAGEMENT TAB (NEW) */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">Course Categories & Academic Disciplines</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">Organize marketplace offerings and course catalogs across Ethiopian curricula.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-slate" />
                  <Input
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="pl-8 text-xs h-8 w-48 sm:w-60 border-brand-border dark:border-stone-700"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchCategories()}
                  className="h-8 text-xs border-brand-border dark:border-stone-700"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-brand-orange" />
                </Button>

                <Button
                  variant="orange"
                  size="sm"
                  onClick={() => {
                    setCategoryModal({ isEditing: false });
                    setCategoryName('');
                    setCategoryDescription('');
                    setCategoryError(null);
                  }}
                  className="gap-1.5 text-xs h-8 shadow-sm"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>New Category</span>
                </Button>
              </div>
            </div>

            {isCategoriesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : filteredCategories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map((cat: any) => (
                  <Card key={cat.id} className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:border-brand-orange/40 transition-colors">
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                      <div className="space-y-0.5">
                        <CardTitle className="text-sm font-bold text-brand-coffee dark:text-stone-100">{cat.name}</CardTitle>
                        <CardDescription className="text-[11px] font-mono text-brand-orange">/{cat.slug}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 text-[10px]">
                        {cat._count?.courses || 0} Courses
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3 text-xs">
                      <p className="text-brand-slate dark:text-stone-400 line-clamp-2 min-h-[2rem]">
                        {cat.description || 'No description provided for this academic category.'}
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border dark:border-stone-800">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCategoryModal({ isEditing: true, category: cat });
                            setCategoryName(cat.name);
                            setCategoryDescription(cat.description || '');
                            setCategoryError(null);
                          }}
                          className="h-7 text-[11px] gap-1 border-brand-border dark:border-stone-700 hover:border-brand-orange/40"
                        >
                          <Edit className="h-3 w-3 text-brand-orange" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCategoryModal(cat)}
                          className="h-7 text-[11px] gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Layers}
                title="No Categories Configured"
                description="Click 'New Category' to establish subject taxonomies for course authors."
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. CONTENT MODERATION (REVIEWS) TAB */}
        {/* ========================================================================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">User Reviews Moderation</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">Purge inappropriate comments, abusive language, or promotional spam.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchReviews()} className="gap-1.5 text-xs border-brand-border dark:border-stone-700">
                <RefreshCw className="h-3.5 w-3.5 text-brand-orange" />
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
                  <Card key={r.id} className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-coffee dark:text-stone-100 text-xs">{r.user.fullName}</span>
                          <span className="text-[10px] text-brand-slate dark:text-stone-400">on &ldquo;{r.course.title}&rdquo;</span>
                          <div className="flex items-center text-amber-500 gap-0.5">
                            {[...Array(r.rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-brand-coffee/90 dark:text-stone-200 italic bg-brand-creamy dark:bg-stone-800 p-2 rounded-md border border-brand-border dark:border-stone-700">
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
                title="No Reviews Flagged"
                description="The review moderation queue has no pending items."
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. INSTITUTIONS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'institutions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">Institutional Tenants & Universities</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">Configure higher-education universities, academic domains, and multi-tenant quotas.</p>
              </div>

              <Button
                variant="orange"
                size="sm"
                onClick={() => setInstitutionModalOpen(true)}
                className="gap-1.5 text-xs shadow-sm"
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
                  <Card key={inst.id} className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-brand-coffee dark:text-stone-100">{inst.name}</CardTitle>
                        <CardDescription className="text-xs font-mono text-brand-orange">{inst.slug}.eduverse.et</CardDescription>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        inst.isActive
                          ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300'
                          : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {inst.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2 p-2 bg-brand-creamy dark:bg-stone-800 rounded-lg text-center">
                        <div>
                          <span className="font-bold text-brand-coffee dark:text-stone-100 block text-sm">{inst._count?.members || 0}</span>
                          <span className="text-[10px] text-brand-slate dark:text-stone-400">Members</span>
                        </div>
                        <div>
                          <span className="font-bold text-brand-coffee dark:text-stone-100 block text-sm">{inst._count?.departments || 0}</span>
                          <span className="text-[10px] text-brand-slate dark:text-stone-400">Depts</span>
                        </div>
                        <div>
                          <span className="font-bold text-brand-coffee dark:text-stone-100 block text-sm">{inst._count?.courses || 0}</span>
                          <span className="text-[10px] text-brand-slate dark:text-stone-400">Courses</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-brand-border dark:border-stone-800">
                        <span className="text-brand-slate dark:text-stone-400 text-[11px] truncate max-w-[200px]">Contact: {inst.contactEmail}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleInstitutionStatusMutation.mutate({ id: inst.id, isActive: !inst.isActive })}
                          className="text-xs h-7 border-brand-border dark:border-stone-700"
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
        {/* 7. PLATFORM SETTINGS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">Global Platform Runtime Configuration</h2>
              <p className="text-xs text-brand-slate dark:text-stone-400">Tune moderation requirements, maintenance modes, and systemic parameters.</p>
            </div>

            {settingsSuccess && (
              <Alert className="bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-200">
                <CheckCircle2 className="h-4 w-4 text-brand-orange" />
                <AlertTitle className="text-xs font-bold">Configuration Saved</AlertTitle>
                <AlertDescription className="text-xs">Platform settings updated and logged to the audit stream.</AlertDescription>
              </Alert>
            )}

            {isSettingsLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <Card className="border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200">Platform Name</Label>
                    <Input
                      defaultValue={settings?.platformName}
                      id="platformNameInput"
                      className="text-xs h-9 border-brand-border dark:border-stone-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200">Support Email</Label>
                    <Input
                      defaultValue={settings?.supportEmail}
                      id="supportEmailInput"
                      className="text-xs h-9 border-brand-border dark:border-stone-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200">Max Upload Size (MB)</Label>
                    <Input
                      type="number"
                      defaultValue={settings?.maxUploadSizeMb}
                      id="maxUploadInput"
                      className="text-xs h-9 border-brand-border dark:border-stone-700"
                    />
                  </div>

                  <div className="pt-2 border-t border-brand-border dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200 block">Require Administrative Course Approval</Label>
                      <span className="text-[11px] text-brand-slate dark:text-stone-400">Courses must be approved by Super Admin before publication</span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={settings?.requireCourseApproval}
                      id="requireApprovalInput"
                      className="h-4 w-4 text-brand-orange rounded border-stone-300 focus:ring-brand-orange"
                    />
                  </div>

                  <div className="pt-2 border-t border-brand-border dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200 block">Maintenance Mode</Label>
                      <span className="text-[11px] text-brand-slate dark:text-stone-400">Temporarily restrict access for scheduled upgrades</span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={settings?.maintenanceMode}
                      id="maintenanceModeInput"
                      className="h-4 w-4 text-brand-orange rounded border-stone-300 focus:ring-brand-orange"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      variant="orange"
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
                      className="text-xs h-9 px-4 shadow-sm"
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
        {/* 8. AUDIT TRAIL TAB */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-coffee dark:text-stone-100">Immutable Audit Trail & Forensics</h2>
                <p className="text-xs text-brand-slate dark:text-stone-400">Tamper-proof event logs detailing administrative mutations, sanitized metadata, and outcomes.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-slate" />
                  <Input
                    placeholder="Search entity..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-8 text-xs h-8 w-48 sm:w-60 border-brand-border dark:border-stone-700"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="rounded-lg border border-brand-border dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-brand-coffee dark:text-stone-100 h-8 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="">All Actions</option>
                  <option value="USER_ACCOUNT_SUSPENDED">Suspensions</option>
                  <option value="USER_ACCOUNT_REACTIVATED">Reactivations</option>
                  <option value="USER_ROLE_CHANGED">Role Changes</option>
                  <option value="COURSE_APPROVED">Course Approvals</option>
                  <option value="COURSE_REJECTED">Course Rejections</option>
                  <option value="CATEGORY_CREATED">Category Created</option>
                  <option value="CATEGORY_UPDATED">Category Updated</option>
                  <option value="CATEGORY_DELETED">Category Deleted</option>
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
              <div className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F2] dark:bg-stone-800 border-b border-brand-border dark:border-stone-700 text-brand-coffee dark:text-stone-300 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Target Resource</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Forensic Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60 dark:divide-stone-800">
                      {auditData.logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-orange-50/20 dark:hover:bg-stone-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-brand-coffee dark:text-stone-100">
                            <span className="p-1 rounded bg-brand-creamy dark:bg-stone-800 text-[10px] border border-brand-border dark:border-stone-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-brand-coffee dark:text-stone-100 block">{log.user?.fullName || 'System Root'}</span>
                            <span className="text-[10px] text-brand-slate dark:text-stone-400 block">{log.user?.email || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4 text-brand-slate dark:text-stone-400 font-mono text-[11px]">
                            {log.entityType}: {log.entityId?.slice(0, 8)}...
                          </td>
                          <td className="py-3 px-4 text-brand-slate dark:text-stone-400 text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAuditDetailModal(log)}
                              className="text-[11px] h-7 px-2 border-brand-border dark:border-stone-700 hover:border-brand-orange/40"
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
              <DialogTitle className="text-lg font-bold text-brand-coffee dark:text-stone-100">
                Curriculum Review: {courseReviewModal.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Instructor: {courseReviewModal.author?.fullName} &bull; Difficulty: {courseReviewModal.difficulty} &bull; Language: {courseReviewModal.language}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-brand-creamy dark:bg-stone-800/60 rounded-xl border border-brand-border dark:border-stone-700">
                <span className="font-semibold text-brand-coffee dark:text-stone-100 block mb-1">Course Description:</span>
                <p className="text-brand-slate dark:text-stone-300 whitespace-pre-wrap">{courseReviewModal.description}</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-brand-coffee dark:text-stone-100 text-sm block">Syllabus Breakdown ({courseReviewModal.sections?.length || 0} Sections)</span>
                {courseReviewModal.sections?.map((sec: any, idx: number) => (
                  <div key={sec.id} className="border border-brand-border dark:border-stone-800 rounded-xl p-3 space-y-2 bg-white dark:bg-stone-900">
                    <div className="font-semibold text-brand-coffee dark:text-stone-100">
                      Section {idx + 1}: {sec.title} ({sec.lessons?.length || 0} lessons)
                    </div>
                    <ul className="pl-4 list-disc space-y-1 text-brand-slate dark:text-stone-400">
                      {sec.lessons?.map((les: any) => (
                        <li key={les.id}>
                          <span className="font-medium text-brand-coffee dark:text-stone-200">{les.title}</span> ({les.durationMinutes} min, {les.type})
                          {les.quiz && <Badge variant="outline" className="ml-2 text-[9px] bg-orange-50 text-orange-800 border-orange-200">Quiz Attached</Badge>}
                          {les.assignment && <Badge variant="outline" className="ml-2 text-[9px] bg-amber-50 text-amber-800 border-amber-200">Assignment Attached</Badge>}
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
                  variant="orange"
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
            <DialogTitle className="text-base font-bold text-brand-coffee dark:text-stone-100">
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
            <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200">Rejection Feedback / Justification *</Label>
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
            <DialogTitle className="text-base font-bold text-brand-coffee dark:text-stone-100">
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
            <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200">
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
              variant={userStatusModal.action === 'suspend' ? 'destructive' : 'orange'}
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

      {/* 4. User Role Modal (NEW) */}
      {userRoleModal && (
        <Dialog open={Boolean(userRoleModal)} onOpenChange={() => setUserRoleModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-coffee dark:text-stone-100">
              Assign Platform Role
            </DialogTitle>
            <DialogDescription className="text-xs">
              Target User: {userRoleModal.fullName} ({userRoleModal.email})
            </DialogDescription>
          </DialogHeader>

          {userRoleError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{userRoleError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-3 text-xs">
            <Label className="font-semibold text-brand-coffee dark:text-stone-200">Select Platform Role *</Label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-lg border border-brand-border dark:border-stone-700 bg-white dark:bg-stone-800 p-2.5 text-xs font-semibold text-brand-coffee dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            >
              <option value="STUDENT">Student (Standard learner)</option>
              <option value="TEACHER">Teacher (Institutional instructor)</option>
              <option value="INDEPENDENT_INSTRUCTOR">Independent Instructor (Marketplace author)</option>
              <option value="INSTITUTION_ADMIN">Institution Admin (Department manager)</option>
              <option value="SUPER_ADMIN">Super Admin (Platform governance)</option>
            </select>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setUserRoleModal(null)}>
              Cancel
            </Button>
            <Button
              variant="orange"
              size="sm"
              disabled={updateUserRoleMutation.isPending}
              onClick={() =>
                updateUserRoleMutation.mutate({
                  userId: userRoleModal.id,
                  role: selectedRole,
                })
              }
            >
              Apply Role Change
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 5. Create / Edit Category Modal (NEW) */}
      {categoryModal && (
        <Dialog open={Boolean(categoryModal)} onOpenChange={() => setCategoryModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-coffee dark:text-stone-100">
              {categoryModal.isEditing ? 'Edit Category' : 'Create Course Category'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define academic categorization and taxonomy tags for instructors.
            </DialogDescription>
          </DialogHeader>

          {categoryError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{categoryError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="font-semibold text-brand-coffee dark:text-stone-200">Category Name *</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Artificial Intelligence & Data Science"
                className="text-xs h-9 border-brand-border dark:border-stone-700"
              />
            </div>

            <div>
              <Label className="font-semibold text-brand-coffee dark:text-stone-200">Description (Optional)</Label>
              <Textarea
                rows={3}
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief summary of topics encompassed by this academic domain..."
                className="text-xs border-brand-border dark:border-stone-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCategoryModal(null)}>
              Cancel
            </Button>
            <Button
              variant="orange"
              size="sm"
              disabled={!categoryName.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
              onClick={() => {
                if (categoryModal.isEditing) {
                  updateCategoryMutation.mutate({
                    id: categoryModal.category.id,
                    dto: {
                      name: categoryName.trim(),
                      description: categoryDescription.trim() || undefined,
                    },
                  });
                } else {
                  createCategoryMutation.mutate({
                    name: categoryName.trim(),
                    description: categoryDescription.trim() || undefined,
                  });
                }
              }}
            >
              {categoryModal.isEditing ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 6. Delete Category Confirmation Modal (NEW) */}
      {deleteCategoryModal && (
        <Dialog open={Boolean(deleteCategoryModal)} onOpenChange={() => setDeleteCategoryModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600">
              Delete Category: {deleteCategoryModal.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this course category? Associated courses ({deleteCategoryModal._count?.courses || 0}) will remain safe but will be unassigned from this category.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteCategoryModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteCategoryMutation.isPending}
              onClick={() => deleteCategoryMutation.mutate(deleteCategoryModal.id)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* 7. Review Moderation Modal */}
      {reviewModerateModal && (
        <Dialog open={Boolean(reviewModerateModal)} onOpenChange={() => setReviewModerateModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-coffee dark:text-stone-100">
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
            <div className="p-2.5 bg-brand-creamy dark:bg-stone-800 border rounded-md text-xs italic">
              &ldquo;{reviewModerateModal.comment}&rdquo;
            </div>
            <Label className="text-xs font-semibold text-brand-coffee dark:text-stone-200">Removal Reason *</Label>
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

      {/* 8. Create Institution Modal */}
      {institutionModalOpen && (
        <Dialog open={institutionModalOpen} onOpenChange={() => setInstitutionModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-coffee dark:text-stone-100">
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
              <Label className="font-semibold text-brand-coffee dark:text-stone-200">Institution Name *</Label>
              <Input
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                placeholder="e.g. Addis Ababa University"
                className="text-xs h-8 border-brand-border dark:border-stone-700"
              />
            </div>

            <div>
              <Label className="font-semibold text-brand-coffee dark:text-stone-200">Slug Code *</Label>
              <Input
                value={instSlug}
                onChange={(e) => setInstSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. aau"
                className="text-xs h-8 font-mono border-brand-border dark:border-stone-700"
              />
            </div>

            <div>
              <Label className="font-semibold text-brand-coffee dark:text-stone-200">Official Domain (Optional)</Label>
              <Input
                value={instDomain}
                onChange={(e) => setInstDomain(e.target.value.toLowerCase())}
                placeholder="e.g. aau.edu.et"
                className="text-xs h-8 font-mono border-brand-border dark:border-stone-700"
              />
            </div>

            <div>
              <Label className="font-semibold text-brand-coffee dark:text-stone-200">Contact Email *</Label>
              <Input
                value={instContactEmail}
                onChange={(e) => setInstContactEmail(e.target.value)}
                placeholder="e.g. administration@aau.edu.et"
                className="text-xs h-8 border-brand-border dark:border-stone-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setInstitutionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="orange"
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

      {/* 9. Forensic Metadata Modal */}
      {auditDetailModal && (
        <Dialog open={Boolean(auditDetailModal)} onOpenChange={() => setAuditDetailModal(null)}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-brand-coffee dark:text-stone-100">
              Audit Record Forensics: {auditDetailModal.action}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              Log ID: {auditDetailModal.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-brand-creamy dark:bg-stone-800 border rounded-xl space-y-1">
              <div><span className="font-semibold text-brand-coffee dark:text-stone-200">Actor:</span> {auditDetailModal.user?.fullName} ({auditDetailModal.user?.email || 'N/A'})</div>
              <div><span className="font-semibold text-brand-coffee dark:text-stone-200">Target Resource:</span> {auditDetailModal.entityType} ({auditDetailModal.entityId})</div>
              <div><span className="font-semibold text-brand-coffee dark:text-stone-200">Timestamp:</span> {new Date(auditDetailModal.createdAt).toISOString()}</div>
            </div>

            <div>
              <span className="font-semibold text-brand-coffee dark:text-stone-200 block mb-1">Sanitized Metadata Payload:</span>
              <pre className="p-3 bg-[#19100C] text-orange-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 border border-[#2A1B14]">
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
