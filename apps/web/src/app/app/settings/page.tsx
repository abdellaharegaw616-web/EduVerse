'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Shield,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Profile schema
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional().or(z.literal('')),
  avatarUrl: z
    .string()
    .url('Must be a valid HTTP/HTTPS URL')
    .optional()
    .or(z.literal('')),
  phoneNumber: z.string().max(20).optional().or(z.literal('')),
  timezone: z.string().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Password schema
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Must contain at least 1 uppercase, 1 lowercase letter, and 1 number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function StudentSettingsPage() {
  const queryClient = useQueryClient();
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 1. Fetch current profile
  const {
    data: userData,
    isLoading: isProfileLoading,
  } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>('/users/profile'),
  });

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      bio: '',
      avatarUrl: '',
      phoneNumber: '',
      timezone: 'Africa/Addis_Ababa',
    },
  });

  useEffect(() => {
    if (userData) {
      resetProfile({
        fullName: userData.fullName || '',
        bio: userData.profile?.bio || '',
        avatarUrl: userData.profile?.avatarUrl || '',
        phoneNumber: userData.profile?.phoneNumber || '',
        timezone: userData.profile?.timezone || 'Africa/Addis_Ababa',
      });
    }
  }, [userData, resetProfile]);

  // Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      apiClient.patch('/users/profile', {
        fullName: values.fullName,
        bio: values.bio || undefined,
        avatarUrl: values.avatarUrl || undefined,
        phoneNumber: values.phoneNumber || undefined,
        timezone: values.timezone || undefined,
      }),
    onSuccess: () => {
      setProfileSuccess('Your profile details have been saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setTimeout(() => setProfileSuccess(null), 4000);
    },
  });

  const onProfileSubmit = async (values: ProfileFormValues) => {
    setProfileSuccess(null);
    await updateProfileMutation.mutateAsync(values);
  };

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setPasswordSuccess('Password successfully changed. Your active session is secure.');
      resetPassword();
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password. Check your current password.');
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      {/* Header */}
      <div className="border-b border-brand-border pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
          Configuration
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">
          Account Settings
        </h1>
        <p className="text-xs text-brand-slate mt-0.5">
          Manage your personal details, learner bio, avatar, and authentication security.
        </p>
      </div>

      {/* Profile Form Card */}
      <Card className="border border-brand-border bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <User className="h-5 w-5 text-brand-emerald" />
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription className="text-xs text-brand-slate">
            Update your public learner profile and contact information across courses.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {profileSuccess && (
            <Alert variant="default" className="mb-6 bg-emerald-50 border-emerald-200 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
              <AlertTitle>Profile Updated</AlertTitle>
              <AlertDescription className="text-xs">{profileSuccess}</AlertDescription>
            </Alert>
          )}

          {isProfileLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 rounded-md" />
              <Skeleton className="h-20 rounded-md" />
              <Skeleton className="h-10 rounded-md" />
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-brand-navy">
                  Legal Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Abebe Tadesse"
                  error={profileErrors.fullName?.message}
                  {...registerProfile('fullName')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-xs font-semibold text-brand-navy">
                  Academic Statement & Bio
                </Label>
                <Textarea
                  id="bio"
                  rows={3}
                  placeholder="Share your learning focus, academic interests, or background..."
                  error={profileErrors.bio?.message}
                  {...registerProfile('bio')}
                />
                <span className="text-[10px] text-brand-slate">Maximum 500 characters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs font-semibold text-brand-navy">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+251 91 123 4567"
                    error={profileErrors.phoneNumber?.message}
                    {...registerProfile('phoneNumber')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs font-semibold text-brand-navy">
                    Timezone
                  </Label>
                  <Input
                    id="timezone"
                    placeholder="Africa/Addis_Ababa"
                    error={profileErrors.timezone?.message}
                    {...registerProfile('timezone')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="avatarUrl" className="text-xs font-semibold text-brand-navy">
                  Avatar Image URL
                </Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://images.eduverse.et/avatars/abebe.jpg"
                  error={profileErrors.avatarUrl?.message}
                  {...registerProfile('avatarUrl')}
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  type="submit"
                  variant="emerald"
                  disabled={isProfileSubmitting || updateProfileMutation.isPending}
                  className="gap-2 text-xs"
                >
                  {isProfileSubmitting || updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Profile</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="border border-brand-border bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand-emerald" />
            <span>Security & Authentication</span>
          </CardTitle>
          <CardDescription className="text-xs text-brand-slate">
            Change your account password to secure your credentials and session.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {passwordSuccess && (
            <Alert variant="default" className="mb-6 bg-emerald-50 border-emerald-200 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-brand-emerald" />
              <AlertTitle>Password Updated</AlertTitle>
              <AlertDescription className="text-xs">{passwordSuccess}</AlertDescription>
            </Alert>
          )}

          {passwordError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Password Change Failed</AlertTitle>
              <AlertDescription className="text-xs">{passwordError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-xs font-semibold text-brand-navy">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword('currentPassword')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold text-brand-navy">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                  error={passwordErrors.newPassword?.message}
                  {...registerPassword('newPassword')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-brand-navy">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat new password"
                  error={passwordErrors.confirmPassword?.message}
                  {...registerPassword('confirmPassword')}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-brand-border text-xs text-brand-slate flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
              <span>
                Passwords must be at least 8 characters long, and contain at least one uppercase letter,
                one lowercase letter, and one number.
              </span>
            </div>

            <div className="pt-3 flex justify-end">
              <Button
                type="submit"
                variant="default"
                disabled={isPasswordSubmitting}
                className="gap-2 text-xs"
              >
                {isPasswordSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                <span>Update Password</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

