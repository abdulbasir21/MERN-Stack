import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = {
  citizen: [
    { to: '/dashboard/citizen', label: 'My Complaints',  icon: 'description' },
    { to: '/complaint/new',     label: 'File Complaint', icon: 'add_circle'  },
  ],
  officer: [
    { to: '/dashboard/officer', label: 'Assigned Cases', icon: 'assignment'  },
  ],
  admin: [
    { to: '/dashboard/admin',   label: 'Dashboard',      icon: 'dashboard'   },
    { to: '/admin/complaints',  label: 'All Complaints', icon: 'description' },
    { to: '/admin/officers',    label: 'Officers',       icon: 'badge'       },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const items = navItems[user.role] || [];

  async function handleLogout() {
    try { await logout(); } catch { toast.error('Logout failed'); }
  }

  const SidebarContent = () => (
    <aside className="bg-primary-container text-on-primary flex flex-col h-full w-64">
      {/* Brand + back to home */}
      <div className="px-6 py-5 border-b border-on-primary-fixed-variant">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline-md text-headline-md text-white">SafeCity</h1>
            <p className="font-label-sm text-label-sm text-on-primary-container capitalize">{user.role} Portal</p>
          </div>
          <Link
            to="/"
            title="Back to home"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-primary-container hover:bg-on-primary-fixed-variant transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>home</span>
          </Link>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-on-primary-fixed-variant">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-on-tertiary-container flex items-center justify-center text-white font-label-md shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-white truncate max-w-[130px]">{user.name}</p>
            <p className="font-label-sm text-label-sm text-on-primary-container truncate max-w-[130px]">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-2 flex flex-col gap-1 px-2 py-2">
        {items.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              isActive
                ? 'bg-secondary-container text-on-secondary-container rounded-lg px-4 py-3 flex items-center gap-3 font-label-md transition-all'
                : 'text-on-primary-container hover:bg-on-primary-fixed-variant px-4 py-3 flex items-center gap-3 rounded-lg font-label-md transition-all'
            }
          >
            <span className="material-symbols-outlined">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-on-primary-fixed-variant">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-primary-container hover:bg-red-500/10 hover:text-red-300 font-label-md transition-all"
        >
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-primary-container border-b border-on-primary-fixed-variant flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-on-primary-container p-1"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="font-headline-md text-headline-md text-white">SafeCity</span>
        <Link to="/" className="ml-auto text-on-primary-container p-1" title="Home">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>home</span>
        </Link>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full">
            <SidebarContent />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white z-20"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </div>
    </>
  );
}
