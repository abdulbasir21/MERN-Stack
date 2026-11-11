import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';
import DashboardPage from './pages/app/DashboardPage';
import SettingsPage from './pages/app/SettingsPage';
import ProjectsPage from './pages/app/ProjectsPage';
import ProjectDetailsPage from './pages/app/ProjectDetailsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="demo" element={<div className="p-8 text-center text-sm font-mono text-secondary">Interactive Demo (Phase 8)</div>} />

            {/* Public-only Auth Routes */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>
          </Route>

          {/* Authenticated App Routes */}
          <Route path="/app" element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailsPage />} />
              <Route path="investigations" element={<div className="p-8 text-center text-sm font-mono text-secondary">Investigations Module (Phase 6)</div>} />
              <Route path="reports" element={<div className="p-8 text-center text-sm font-mono text-secondary">Change Intelligence Reports (Phase 7)</div>} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
