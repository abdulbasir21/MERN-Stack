import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/public/HomePage';
import DashboardPage from './pages/app/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="demo" element={<div className="p-8 text-center">Interactive Demo (Phase 8)</div>} />
          <Route path="login" element={<div className="p-8 text-center">Login (Phase 2)</div>} />
          <Route path="register" element={<div className="p-8 text-center">Register (Phase 2)</div>} />
          <Route path="forgot-password" element={<div className="p-8 text-center">Forgot Password (Phase 2)</div>} />
        </Route>

        {/* Authenticated App Routes */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<div className="p-8 text-center">Projects Module (Phase 3)</div>} />
          <Route path="investigations" element={<div className="p-8 text-center">Investigations Module (Phase 6)</div>} />
          <Route path="reports" element={<div className="p-8 text-center">Reports Module (Phase 7)</div>} />
          <Route path="settings" element={<div className="p-8 text-center">Settings (Phase 2b)</div>} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
