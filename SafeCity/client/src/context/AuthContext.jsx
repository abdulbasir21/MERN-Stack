import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

function getRoleDashboard(role) {
  if (role === 'citizen') return '/dashboard/citizen';
  if (role === 'officer') return '/dashboard/officer';
  if (role === 'admin') return '/dashboard/admin';
  return '/';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // On mount, check if we have a valid session via the httpOnly cookie
  useEffect(() => {
    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function register(data) {
    const res = await api.post('/auth/register', data);
    const u = res.data.user;
    setUser(u);
    navigate(getRoleDashboard(u.role));
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const u = res.data.user;
    setUser(u);
    navigate(getRoleDashboard(u.role));
  }

  async function demoLogin(role) {
    const res = await api.post('/auth/demo-login', { role });
    const u = res.data.user;
    setUser(u);
    navigate(getRoleDashboard(u.role));
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/');
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
