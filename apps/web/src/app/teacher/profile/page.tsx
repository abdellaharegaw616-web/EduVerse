'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  Clock,
  Calendar,
  Building,
  GraduationCap,
  ShieldCheck,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

export default function TeacherProfilePage() {
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [timezone, setTimezone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserProfileResponse>({
    queryKey: ['teacher-profile'],
    queryFn: async () => {
      const data = await apiClient.get<UserProfileResponse>('/users/profile');
      setFullName(data.fullName || '');
      setBio(data.profile?.bio || '');
      setPhoneNumber(data.profile?.phoneNumber || '');
      setTimezone(data.profile?.timezone || 'Africa/Addis_Ababa');
      setAvatarUrl(data.profile?.avatarUrl || '');
      return data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (overrideData?: Record<string, any>) =>
      apiClient.patch('/users/profile', {
        fullName,
        bio,
        phoneNumber,
        timezone,
        avatarUrl: avatarUrl || undefined,
        ...overrideData,
      }),
    onSuccess: async () => {
      setSuccessMessage('Instructor profile saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await refetchUser();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('eduverse:profile-updated'));
      }
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
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
        setAvatarUrl(base64String);
        setSuccessMessage('Profile photo updated successfully.');
        queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
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

  const handleModalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
            Faculty Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
            Instructor Profile & Credentials
          </h1>
          <p className="text-xs text-brand-slate mt-0.5">
            Your public educator persona, academic biography, and institutional faculty affiliations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="gap-1.5 text-xs"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit Profile</span>
        </Button>
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
            <span>{(error as any)?.message || 'Failed to fetch instructor identity.'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* Identity Card */}
          <Card className="border border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="h-28 bg-slate-900 dark:bg-slate-950 border-b border-slate-800 p-4 flex items-start justify-end relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-brand-emerald" />
              <Badge variant="outline" className="bg-slate-800/90 text-white border-slate-700 font-semibold text-xs gap-1.5 shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-emerald" />
                {user.role}
              </Badge>
            </div>

            <CardContent className="px-4 sm:px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 items-center sm:items-end text-center sm:text-left">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 bg-brand-navy dark:bg-slate-800 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden cursor-pointer group"
                    title="Click to upload profile photo"
                  >
                    {user.profile?.avatarUrl ? (
                      <img
                        src={user.profile.avatarUrl}
                        alt={user.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.fullName?.charAt(0) || 'T'
                    )}

                    {/* Camera Overlay */}
                    <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-medium">
                      <Camera className="h-5 w-5 mb-0.5 text-brand-emerald" />
                      <span>Upload</span>
                    </div>

                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-brand-navy/80 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-brand-emerald animate-spin" />
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
                    <h2 className="text-lg sm:text-xl font-bold text-brand-navy dark:text-slate-100">
                      {user.fullName || 'Educator Profile'}
                    </h2>
                    <p className="text-xs text-brand-slate flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1 text-xs w-full sm:w-auto h-9"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Update Profile</span>
                </Button>
              </div>

              {/* Bio */}
              <div className="mt-6 pt-5 border-t border-brand-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-slate mb-2">
                  Academic Biography & Background
                </h3>
                <p className="text-sm text-brand-navy leading-relaxed">
                  {user.profile?.bio ||
                    'No academic biography provided yet. Click "Edit Profile" to summarize your academic focus, publications, and teaching background.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Details & Institutional Affiliations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-brand-border bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-emerald" />
                  <span>Contact & Timezone</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-brand-border/60 text-xs">
                  <span className="text-brand-slate flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Work Email
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
                    <Calendar className="h-3.5 w-3.5" /> Educator Since
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

            <Card className="border border-brand-border bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-brand-navy flex items-center gap-2">
                  <Building className="h-4 w-4 text-brand-emerald" />
                  <span>University & Institutional Faculty</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.institutionMemberships && user.institutionMemberships.length > 0 ? (
                  <div className="space-y-3">
                    {user.institutionMemberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="p-3.5 rounded-xl border border-brand-border bg-slate-50 flex items-center justify-between"
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
                              Faculty Status: {membership.role}
                            </span>
                          </div>
                        </div>
                        <Badge variant="emerald" className="text-[10px]">
                          Verified
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-brand-slate space-y-1">
                    <p className="font-bold text-brand-navy">Independent Course Author</p>
                    <p>Accredited for open public curricula delivery on EduVerse Academy.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Edit Profile Dialog Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogHeader>
          <DialogTitle>Edit Instructor Profile</DialogTitle>
          <DialogDescription>
            Update your public faculty credentials and personal bio across your course pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Avatar Photo Section */}
          <div className="space-y-2 p-3 rounded-lg border border-brand-border bg-slate-50">
            <Label className="text-xs font-semibold text-brand-navy block">Profile Photo</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-white bg-brand-emerald text-white font-extrabold text-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  fullName?.charAt(0) || 'T'
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="h-8 text-xs gap-1.5 bg-white"
                  >
                    <Upload className="h-3.5 w-3.5 text-brand-emerald" />
                    <span>Upload New Photo</span>
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl('')}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleModalPhotoSelect}
                />
                <p className="text-[10px] text-brand-slate">JPG, PNG, or WebP up to 5MB.</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-brand-navy">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-brand-navy">Phone Number</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251 91 123 4567"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-brand-navy">Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Africa/Addis_Ababa"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-brand-navy">Academic Biography</Label>
            <Textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Highlight your academic domain, degrees, industry background..."
              className="text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-brand-border">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              variant="emerald"
              size="sm"
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending || !fullName.trim()}
              className="gap-1.5 text-xs font-bold"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save Profile</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
