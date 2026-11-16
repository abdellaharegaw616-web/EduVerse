'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import {
  User,
  Mail,
  Phone,
  Clock,
  Calendar,
  Building,
  ShieldCheck,
  Edit3,
  AlertCircle,
  GraduationCap,
  Camera,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  profile?: {
    id: string;
    bio?: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    timezone?: string | null;
  } | null;
  institutionMemberships?: Array<{
    id: string;
    role: string;
    institution: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export default function StudentProfilePage() {
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserProfileResponse>({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<UserProfileResponse>('/users/profile'),
  });

  const handleDirectAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await apiClient.patch('/users/profile', { avatarUrl: base64String });
        setSuccessMessage('Profile photo updated successfully.');
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
        await refetchUser();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eduverse:profile-updated'));
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err: any) {
        alert(err?.message || 'Failed to upload profile photo.');
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Account & Identity
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-coffee dark:text-stone-100">
            Student Academic Profile
          </h1>
          <p className="text-xs text-brand-slate dark:text-stone-400 mt-0.5">
            Your verified identity, institutional affiliations, and public learner metadata.
          </p>
        </div>

        <Link href="/app/settings">
          <Button variant="outline" size="sm" className="gap-1.5 hover:border-brand-orange/40 hover:text-brand-orange">
            <Edit3 className="h-3.5 w-3.5 text-brand-orange" />
            <span>Edit Profile</span>
          </Button>
        </Link>
      </div>

      {successMessage && (
        <Alert variant="default" className="bg-orange-50 border-orange-200 text-orange-950 dark:bg-orange-950/40 dark:border-orange-800/40 dark:text-orange-200">
          <CheckCircle2 className="h-4 w-4 text-brand-orange" />
          <AlertTitle>Profile Updated</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Retrieval Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{(error as any)?.message || 'Unable to retrieve student profile records.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* Identity Header Card */}
          <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs overflow-hidden">
            <div className="h-28 bg-brand-coffee dark:bg-stone-950 border-b border-brand-border dark:border-stone-800 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange" />
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-stone-800/90 text-white border-stone-700 font-semibold text-[11px] gap-1 shadow-xs">
                  <GraduationCap className="h-3.5 w-3.5 text-brand-orange" />
                  {user.role}
                </Badge>
                {user.isEmailVerified && (
                  <Badge variant="orange" className="gap-1 text-[11px] bg-brand-orange text-white border-brand-orange">
                    <ShieldCheck className="h-3 w-3" />
                    Verified Email
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="px-4 sm:px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 items-center sm:items-end text-center sm:text-left">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-2xl border-4 border-white dark:border-stone-900 bg-brand-coffee dark:bg-stone-800 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden cursor-pointer group"
                    title="Click to upload profile photo"
                  >
                    {user.profile?.avatarUrl ? (
                      <img
                        src={user.profile.avatarUrl}
                        alt={user.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(user.fullName)
                    )}

                    {/* Camera Overlay */}
                    <div className="absolute inset-0 bg-brand-coffee/60 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-medium">
                      <Camera className="h-5 w-5 mb-0.5 text-brand-orange" />
                      <span>Upload</span>
                    </div>

                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-brand-coffee/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-brand-orange animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleDirectAvatarUpload}
                  />
                  <div className="mb-1">
                    <h2 className="text-lg sm:text-xl font-bold text-brand-coffee dark:text-stone-100">{user.fullName}</h2>
                    <p className="text-xs text-brand-slate dark:text-stone-400 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                </div>

                <Link href="/app/settings" className="w-full sm:w-auto">
                  <Button variant="default" size="sm" className="gap-1 text-xs w-full sm:w-auto h-9">
                    <Edit3 className="h-3 w-3" />
                    <span>Manage Account</span>
                  </Button>
                </Link>
              </div>

              {/* Bio snippet */}
              <div className="mt-6 pt-5 border-t border-brand-border dark:border-stone-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-slate dark:text-stone-400 mb-2">
                  Academic Statement & Bio
                </h3>
                <p className="text-sm text-brand-coffee/90 dark:text-stone-200 leading-relaxed">
                  {user.profile?.bio || 'No personal bio provided yet. Add an academic statement or focus area in settings.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Details & Institutional Affiliations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact & Locale Details */}
            <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-brand-coffee dark:text-stone-100 flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-orange" />
                  <span>Personal & System Metadata</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-brand-border/60 dark:border-stone-800 text-xs">
                  <span className="text-brand-slate dark:text-stone-400 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-brand-orange" /> Primary Email
                  </span>
                  <span className="font-semibold text-brand-coffee dark:text-stone-100">{user.email}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-brand-border/60 dark:border-stone-800 text-xs">
                  <span className="text-brand-slate dark:text-stone-400 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-brand-orange" /> Phone Number
                  </span>
                  <span className="font-semibold text-brand-coffee dark:text-stone-100">
                    {user.profile?.phoneNumber || 'Not provided'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-brand-border/60 dark:border-stone-800 text-xs">
                  <span className="text-brand-slate dark:text-stone-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand-orange" /> Timezone
                  </span>
                  <span className="font-semibold text-brand-coffee dark:text-stone-100">
                    {user.profile?.timezone || 'Africa/Addis_Ababa'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="text-brand-slate dark:text-stone-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-brand-orange" /> Enrolled Since
                  </span>
                  <span className="font-semibold text-brand-coffee dark:text-stone-100">
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Institutional Memberships */}
            <Card className="border border-brand-border dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-brand-coffee dark:text-stone-100 flex items-center gap-2">
                  <Building className="h-4 w-4 text-brand-orange" />
                  <span>Institutional Affiliations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.institutionMemberships && user.institutionMemberships.length > 0 ? (
                  <div className="space-y-3">
                    {user.institutionMemberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="p-3.5 rounded-xl border border-brand-border dark:border-stone-800 bg-brand-creamy/40 dark:bg-stone-800/40 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 text-brand-orange dark:bg-orange-950/60 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-brand-coffee dark:text-stone-100">
                              {membership.institution.name}
                            </h4>
                            <span className="text-[10px] text-brand-slate dark:text-stone-400">
                              Member status: {membership.role}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-orange-200 text-brand-orange">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-brand-slate dark:text-stone-400 space-y-1">
                    <p className="font-medium text-brand-coffee dark:text-stone-100">EduVerse Global Learner</p>
                    <p>Independent student account. Enrolled across open public curriculums.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

