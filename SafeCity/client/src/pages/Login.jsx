import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

function getRoleDashboard(role) {
  if (role === 'citizen') return '/dashboard/citizen';
  if (role === 'officer') return '/dashboard/officer';
  if (role === 'admin') return '/dashboard/admin';
  return '/';
}

const demoRoles = [
  { role: 'citizen', label: 'Demo Citizen', icon: 'person',               cred: 'citizen@safecity.demo' },
  { role: 'officer', label: 'Demo Officer', icon: 'badge',                cred: 'officer1@safecity.demo' },
  { role: 'admin',   label: 'Demo Admin',   icon: 'admin_panel_settings', cred: 'admin@safecity.demo' },
];

export default function Login() {
  const { user, login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (user) navigate(getRoleDashboard(user.role));
  }, [user]);

  async function onSubmit({ email, password }) {
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Login failed');
    }
  }

  async function handleDemo(role) {
    try {
      await demoLogin(role);
      toast.success(`Logged in as demo ${role}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Demo login failed');
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2 text-white font-headline-md text-headline-md">
          <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '28px' }}>shield</span>
          SafeCity Portal
        </Link>
        <div>
          <h2 className="font-headline-xl text-headline-xl text-white mb-space-md">Your voice, heard and acted upon.</h2>
          <p className="font-body-lg text-body-lg text-on-primary-container">
            File complaints, track resolutions, and help build a safer community — all in one place.
          </p>
        </div>
        <p className="font-label-sm text-label-sm text-on-primary-container">
          © {new Date().getFullYear()} SafeCity Portal
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-gutter py-space-2xl">
        <div className="w-full max-w-md">
          {/* Back to home */}
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors mb-space-xl"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            Back to home
          </Link>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 text-primary font-headline-md text-headline-md mb-space-xl lg:hidden">
            <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '28px' }}>shield</span>
            SafeCity Portal
          </div>

          <h1 className="font-headline-lg text-headline-lg text-primary mb-1">Sign in</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-xl">
            Don't have an account?{' '}
            <Link to="/register" className="text-on-tertiary-container hover:underline font-label-md">Create one</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-space-md">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Email address</label>
              <input
                type="email"
                autoComplete="email"
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-error font-label-sm text-label-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-error font-label-sm text-label-sm mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full justify-center">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="relative my-space-xl">
            <div className="border-t border-border-subtle" />
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-background px-3 font-label-sm text-label-sm text-on-surface-variant">or try a demo account</span>
          </div>

          {/* Demo buttons with credential hint */}
          <div className="grid grid-cols-3 gap-space-sm mb-space-md">
            {demoRoles.map(({ role, label, icon }) => (
              <button
                key={role}
                onClick={() => handleDemo(role)}
                className="flex flex-col items-center gap-1 border border-border-subtle rounded-xl py-3 px-2 hover:border-on-tertiary-container hover:bg-surface-container-low transition-all"
              >
                <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '20px' }}>{icon}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant text-center">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
            All demo accounts use password: <span className="font-medium text-on-surface">Demo@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
