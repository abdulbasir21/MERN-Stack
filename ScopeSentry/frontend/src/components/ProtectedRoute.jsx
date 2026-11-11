import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-secondary">AUTHENTICATING SESSION...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
