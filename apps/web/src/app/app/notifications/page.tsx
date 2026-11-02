'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  BookOpen,
  Calendar,
  AlertCircle,
  FileCheck,
  Megaphone,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export default function StudentNotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<NotificationItem[]>({
    queryKey: ['my-notifications'],
    queryFn: () => apiClient.get<NotificationItem[]>('/notifications/my'),
  });

  const markSingleMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const filteredNotifications = (notifications || []).filter((item) => {
    if (filter === 'unread') return !item.isRead;
    return true;
  });

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return <Megaphone className="h-4 w-4 text-brand-emerald" />;
      case 'ASSIGNMENT_DUE':
        return <Calendar className="h-4 w-4 text-amber-500" />;
      case 'GRADE_POSTED':
        return <FileCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-brand-navy" />;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Communications
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Notifications & Broadcasts
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Stay updated with coursework releases, deadlines, instructor evaluations, and institutional announcements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="text-xs gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Fetch Notifications</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Failed to retrieve notification stream.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-brand-navy text-white shadow-sm'
              : 'bg-white border border-brand-border text-brand-slate hover:text-brand-navy'
          }`}
        >
          All ({notifications?.length || 0})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-brand-navy text-white shadow-sm'
              : 'bg-white border border-brand-border text-brand-slate hover:text-brand-navy'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all ${
                item.isRead
                  ? 'bg-white border-brand-border/70 opacity-80'
                  : 'bg-emerald-50/20 border-brand-emerald/30 shadow-xs'
              } flex flex-col sm:flex-row sm:items-start justify-between gap-4`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    item.isRead ? 'bg-slate-100' : 'bg-brand-emerald/10'
                  }`}
                >
                  {getNotificationIcon(item.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-brand-navy">{item.title}</h3>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-emerald shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-brand-slate leading-relaxed">{item.message}</p>
                  <span className="text-[10px] text-brand-slate/80 block pt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {item.link && (
                  <Link href={item.link}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                )}

                {!item.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markSingleMutation.mutate(item.id)}
                    disabled={markSingleMutation.isPending}
                    className="h-7 text-xs text-brand-slate hover:text-brand-navy"
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'All Caught Up!' : 'No Notifications'}
          description={
            filter === 'unread'
              ? 'You have addressed all pending notifications and alerts.'
              : 'System alerts, grade feedback, and course broadcasts will appear here.'
          }
          actionHref="/app/dashboard"
          actionLabel="Back to Dashboard"
        />
      )}
    </div>
  );
}

