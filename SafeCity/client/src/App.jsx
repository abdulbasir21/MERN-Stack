import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Citizen pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import NewComplaint from './pages/citizen/NewComplaint';
import ComplaintDetail from './pages/citizen/ComplaintDetail';

// Officer pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import ManageComplaint from './pages/officer/ManageComplaint';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AllComplaints from './pages/admin/AllComplaints';
import ManageOfficers from './pages/admin/ManageOfficers';

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Citizen */}
      <Route path="/dashboard/citizen" element={
        <ProtectedRoute allowedRoles={['citizen']}><CitizenDashboard /></ProtectedRoute>
      } />
      <Route path="/complaint/new" element={
        <ProtectedRoute allowedRoles={['citizen']}><NewComplaint /></ProtectedRoute>
      } />
      <Route path="/complaint/:id" element={
        <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}><ComplaintDetail /></ProtectedRoute>
      } />

      {/* Officer */}
      <Route path="/dashboard/officer" element={
        <ProtectedRoute allowedRoles={['officer']}><OfficerDashboard /></ProtectedRoute>
      } />
      <Route path="/complaint/:id/manage" element={
        <ProtectedRoute allowedRoles={['officer', 'admin']}><ManageComplaint /></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/complaints" element={
        <ProtectedRoute allowedRoles={['admin']}><AllComplaints /></ProtectedRoute>
      } />
      <Route path="/admin/officers" element={
        <ProtectedRoute allowedRoles={['admin']}><ManageOfficers /></ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: '#269f93', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
