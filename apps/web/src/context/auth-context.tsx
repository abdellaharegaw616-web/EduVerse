'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, UserSummary } from '@/lib/api';

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<UserSummary>;
  registerUser: (fullName: string, email: string, password: string) => Promise<{ message: string; user: UserSummary }>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<UserSummary | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetchUser = useCallback(async (): Promise<UserSummary | null> => {
    try {
      const data = await apiClient.get<UserSummary>('/auth/me');
      if (data && data.id) {
        setUser(data);
        return data;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session hydration from backend cookie
    refetchUser();

    // Event listener for unauthorized session expirations
    const handleUnauthorized = () => {
      setUser(null);
      setIsLoading(false);
    };

    // Event listener for profile/avatar updates
    const handleProfileUpdated = () => {
      refetchUser();
    };

    window.addEventListener('eduverse:unauthorized', handleUnauthorized);
    window.addEventListener('eduverse:profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('eduverse:unauthorized', handleUnauthorized);
      window.removeEventListener('eduverse:profile-updated', handleProfileUpdated);
    };
  }, [refetchUser]);

  const login = async (email: string, password: string): Promise<UserSummary> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ message: string; user: UserSummary }>(
        '/auth/login',
        { email, password },
      );

      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ message: string; user: UserSummary }> => {
    return apiClient.post<{ message: string; user: UserSummary }>('/auth/register', {
      fullName,
      email,
      password,
    });
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Logout notification failed on backend:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push('/login?logout=success');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        registerUser,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

