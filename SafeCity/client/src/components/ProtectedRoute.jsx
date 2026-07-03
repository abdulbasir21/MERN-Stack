import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function getRoleDashboard(role) {
  if (role === 'citizen') return '/dashboard/citizen';
  if (role === 'officer') return '/dashboard/officer';
  if (role === 'admin') return '/dashboard/admin';
  return '/';
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: '36px' }}>
          progress_activity
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    toast.error('Access denied');
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  return children;
}
