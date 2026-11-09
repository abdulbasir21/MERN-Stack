import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { useAuth } from './context/useAuth';
import type { Role } from './types/auth';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TasksPage } from './pages/TasksPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavePage } from './pages/LeavePage';
import { FinancePage } from './pages/FinancePage';
import { InventoryPage } from './pages/InventoryPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingScreen } from './components/common/LoadingScreen';
import { RestrictedInDemoPage } from './components/common/RestrictedInDemoPage';

function ProtectedRoute({
  children,
  allowedRoles,
  moduleName,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
  moduleName?: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Verifying your session" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <AppShell>
        <RestrictedInDemoPage moduleName={moduleName} />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const { user, isLoading } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [isLoaderMounted, setIsLoaderMounted] = useState(isLoading);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (shouldReduceMotion) {
        setIsLoaderMounted(false);
        return;
      }
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsLoaderMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsLoaderMounted(true);
      setIsFadingOut(false);
    }
  }, [isLoading, shouldReduceMotion]);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={user.mustChangePassword ? '/change-password' : '/'} replace /> : <LoginPage />}
        />
        <Route
          path="/change-password"
          element={user ? <ChangePasswordPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRoles={['OWNER', 'HR_MANAGER']} moduleName="Resource & HR">
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute
              allowedRoles={['OWNER', 'PROJECT_MANAGER', 'EMPLOYEE']}
              moduleName="Project Portfolio"
            >
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute
              allowedRoles={['OWNER', 'PROJECT_MANAGER', 'EMPLOYEE']}
              moduleName="Tasks & Deliverables"
            >
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave"
          element={
            <ProtectedRoute>
              <LeavePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute allowedRoles={['OWNER', 'FINANCE_MANAGER']} moduleName="Financial Ledger">
              <FinancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute
              allowedRoles={['OWNER', 'INVENTORY_MANAGER', 'EMPLOYEE']}
              moduleName="Asset & Inventory"
            >
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={['OWNER']} moduleName="Audit Log">
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['OWNER']} moduleName="Company Settings">
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        {/* Module placeholders */}
        <Route
          path="/:module"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isLoaderMounted && <LoadingScreen isFadingOut={isFadingOut} />}
    </>
  );
}
