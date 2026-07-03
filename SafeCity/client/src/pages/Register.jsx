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

export default function Register() {
  const { user, register: authRegister } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const password = watch('password');

  useEffect(() => {
    if (user) navigate(getRoleDashboard(user.role));
  }, [user]);

  async function onSubmit({ name, email, password }) {
    try {
      await authRegister({ name, email, password });
      toast.success('Account created! Welcome to SafeCity.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed');
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
          <h2 className="font-headline-xl text-headline-xl text-white mb-space-md">Join thousands making a difference.</h2>
          <p className="font-body-lg text-body-lg text-on-primary-container">
            Your account lets you track every complaint, receive updates, and see real resolutions.
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

          <h1 className="font-headline-lg text-headline-lg text-primary mb-1">Create account</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-xl">
            Already have an account?{' '}
            <Link to="/login" className="text-on-tertiary-container hover:underline font-label-md">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-space-md">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Full name</label>
              <input
                type="text"
                autoComplete="name"
                {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                placeholder="Jane Smith"
              />
              {errors.name && <p className="text-error font-label-sm text-label-sm mt-1">{errors.name.message}</p>}
            </div>

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
                autoComplete="new-password"
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                placeholder="Min. 6 characters"
              />
              {errors.password && <p className="text-error font-label-sm text-label-sm mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: v => v === password || 'Passwords do not match'
                })}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                placeholder="Repeat password"
              />
              {errors.confirmPassword && <p className="text-error font-label-sm text-label-sm mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full justify-center">
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-space-lg font-label-sm text-label-sm text-on-surface-variant text-center">
            By registering you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
