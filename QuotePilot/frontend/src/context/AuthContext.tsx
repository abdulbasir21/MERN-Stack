'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setAuthToken, getAuthToken } from '@/lib/api';

export type UserRole = 'customer' | 'company_admin' | 'platform_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  companyId?: string;
  companyStatus?: 'pending' | 'approved' | 'rejected' | 'blocked';
  status?: 'active' | 'blocked';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (token: string, user: User, redirectTo?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const existingToken = getAuthToken();
    if (!existingToken) {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient<{ user: User }>('/auth/me');
      setUser(res.data.user);
      setTokenState(existingToken);
    } catch {
      setAuthToken(null);
      setUser(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const getRoleDashboard = (targetUser: User): string => {
    switch (targetUser.role) {
      case 'platform_admin':
        return '/admin/companies';
      case 'company_admin':
        if (targetUser.companyStatus && targetUser.companyStatus !== 'approved') {
          return '/company/status';
        }
        return '/company/inquiries';
      case 'customer':
      default:
        return '/inquiries';
    }
  };

  const login = (newToken: string, newUser: User, redirectTo?: string) => {
    setIsLoggingOut(false);
    if (typeof window !== 'undefined') {
      (window as any).__isLoggingOut = false;
    }
    setAuthToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
    setIsLoading(false);

    // Filter out home screen or auth pages as redirectTo targets so users always land on dashboards
    const isCleanRedirect =
      redirectTo &&
      redirectTo !== '/' &&
      !redirectTo.startsWith('/login') &&
      !redirectTo.startsWith('/register');

    let target = isCleanRedirect ? redirectTo : getRoleDashboard(newUser);

    // Prevent cross-role routing mismatches (e.g. customer landing on provider desk)
    if (newUser.role === 'customer' && (target.startsWith('/company') || target.startsWith('/admin'))) {
      target = '/inquiries';
    } else if (newUser.role === 'company_admin' && (target.startsWith('/inquiries') || target.startsWith('/admin'))) {
      target = newUser.companyStatus && newUser.companyStatus !== 'approved' ? '/company/status' : '/company/inquiries';
    } else if (newUser.role === 'platform_admin' && (target.startsWith('/company') || target.startsWith('/inquiries'))) {
      target = '/admin/companies';
    }

    router.push(target);
  };

  const logout = () => {
    setIsLoggingOut(true);
    if (typeof window !== 'undefined') {
      (window as any).__isLoggingOut = true;
    }
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isLoggingOut, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
