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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Account & Identity
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Student Academic Profile
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Your verified identity, institutional affiliations, and public learner metadata.
          </p>
        </div>

        <Link href="/app/settings">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </Button>
        </Link>
      </div>

      {successMessage && (
        <Alert variant="default" className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
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
          <Card className="border border-brand-border bg-white shadow-xs overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-brand-navy via-slate-800 to-brand-emerald relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-white/90 text-brand-navy border-white/20 font-semibold text-[11px]">
                  {user.role}
                </Badge>
                {user.isEmailVerified && (
                  <Badge variant="emerald" className="gap-1 text-[11px]">
                    <ShieldCheck className="h-3 w-3" />
                    Verified Email
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
                <div className="flex items-end gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-24 rounded-2xl border-4 border-white bg-brand-emerald text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden cursor-pointer group"
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
                    <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-medium">
                      <Camera className="h-5 w-5 mb-0.5 text-brand-emerald" />
                      <span>Upload</span>
                    </div>

                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-brand-navy/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-brand-emerald animate-spin" />
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
                    <h2 className="text-xl font-bold text-brand-navy">{user.fullName}</h2>
                    <p className="text-xs text-brand-slate flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </p>
                  </div>
                </div>

                <Link href="/app/settings">
                  <Button variant="default" size="sm" className="gap-1 text-xs">
                    <Edit3 className="h-3 w-3" />
                    <span>Manage Account</span>
                  </Button>
                </Link>
              </div>

              {/* Bio snippet */}
              <div className="mt-6 pt-5 border-t border-brand-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-slate mb-2">
                  Academic Statement & Bio
                </h3>
                <p className="text-sm text-brand-navy/90 leading-relaxed">
                  {user.profile?.bio || 'No personal bio provided yet. Add an academic statement or focus area in settings.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Details & Institutional Affiliations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact & Locale Details */}
            <Card className="border border-brand-border bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-emerald" />
                  <span>Personal & System Metadata</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-brand-border/60 text-xs">
                  <span className="text-brand-slate flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Primary Email
                  </span>
                  <span className="font-semibold text-brand-navy">{user.email}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-brand-border/60 text-xs">
                  <span className="text-brand-slate flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone Number
                  </span>
                  <span className="font-semibold text-brand-navy">
                    {user.profile?.phoneNumber || 'Not provided'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-brand-border/60 text-xs">
                  <span className="text-brand-slate flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Timezone
                  </span>
                  <span className="font-semibold text-brand-navy">
                    {user.profile?.timezone || 'Africa/Addis_Ababa'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="text-brand-slate flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Enrolled Since
                  </span>
                  <span className="font-semibold text-brand-navy">
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
            <Card className="border border-brand-border bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                  <Building className="h-4 w-4 text-brand-emerald" />
                  <span>Institutional Affiliations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.institutionMemberships && user.institutionMemberships.length > 0 ? (
                  <div className="space-y-3">
                    {user.institutionMemberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="p-3.5 rounded-xl border border-brand-border bg-slate-50/50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-emerald/10 text-brand-emerald flex items-center justify-center">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-brand-navy">
                              {membership.institution.name}
                            </h4>
                            <span className="text-[10px] text-brand-slate">
                              Member status: {membership.role}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-brand-slate space-y-1">
                    <p className="font-medium text-brand-navy">EduVerse Global Learner</p>
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

