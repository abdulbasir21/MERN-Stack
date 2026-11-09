import React, { useEffect, useState, useCallback } from 'react';
import type { User } from '../types/auth';
import { AuthContext } from './useAuth';
import { API_BASE } from '../lib/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        setUser(body.data.user);
      } else {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const retryMe = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include',
          });
          if (retryMe.ok) {
            const body = await retryMe.json();
            setUser(body.data.user);
            return;
          }
        }
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    checkAuth().then(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
