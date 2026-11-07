'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If logout is in progress, do not trigger redirect to /login
    if (isLoggingOut || (typeof window !== 'undefined' && (window as any).__isLoggingOut)) {
      return;
    }

    if (!isLoading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        // Redirect to appropriate landing based on their actual role
        if (user.role === 'platform_admin') router.push('/admin/companies');
        else if (user.role === 'company_admin') router.push('/company/inquiries');
        else router.push('/inquiries');
      }
    }
  }, [user, isLoading, isLoggingOut, allowedRoles, router, pathname]);

  if (isLoading || isLoggingOut || !user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-ink-secondary">
            {isLoggingOut ? 'Signing out...' : 'Verifying credentials...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
