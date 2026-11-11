import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, fetchCsrfToken } from '../../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initAuth() {
      try {
        await fetchCsrfToken();
        const res = await apiClient('/auth/me');
        if (res?.data?.user) {
          setUser(res.data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async ({ email, password }) => {
    setError(null);
    try {
      const res = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res?.data?.user) {
        setUser(res.data.user);
        await fetchCsrfToken();
        return res.data.user;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async ({ email, password, name }) => {
    setError(null);
    try {
      const res = await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      });
      if (res?.data?.user) {
        setUser(res.data.user);
        await fetchCsrfToken();
        return res.data.user;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiClient('/auth/me');
      if (res?.data?.user) {
        setUser(res.data.user);
      }
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user
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
