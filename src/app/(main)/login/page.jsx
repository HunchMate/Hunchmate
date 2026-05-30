'use client';

import { useCallback, useState } from 'react';
import { Link, useNavigate } from '@/utils/router';
import { Mail, Lock, AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import StatefulButton from '@/components/ui/StatefulButton';
import { ShinyButton } from '@/components/ui/ShinyButton';
import '@/vite-pages/Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();

  const getPostAuthPath = useCallback((nextUser) => {
    if (nextUser?.role === 'admin') {
      return '/admin/dashboard';
    }

    if (!nextUser?.onboardingCompleted) {
      return nextUser?.role === 'organizer' ? '/host-onboarding' : '/onboarding';
    }
    return nextUser.role === 'admin'
      ? '/admin/dashboard'
      : nextUser.role === 'organizer'
        ? '/organizer/dashboard'
        : '/events';
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    setLoading(true);

    const normalizedIdentity = email.trim().toLowerCase();
    const result = await login(normalizedIdentity, password);
    if (result.success) {
      const pendingInvite = String(localStorage.getItem('hm_pending_invite') || '').trim();
      const hasValidInvite = /^[a-zA-Z0-9_-]+$/.test(pendingInvite);
      const path = hasValidInvite
        ? `/invites/${pendingInvite}`
        : getPostAuthPath(result.user);
      if (pendingInvite) localStorage.removeItem('hm_pending_invite');
      navigate(path, { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  // Returns a Promise so StatefulButton can show the loading + check animation
  const handleSubmitPromise = () => new Promise((resolve, reject) => {
    handleSubmit()
      .then(resolve)
      .catch((err) => {
        console.error("Login unhandled error:", err);
        setError(err?.message || "An unexpected error occurred");
        reject(err);
      });
  });

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    const result = await googleAuth({ role: 'participant' });
    if (result.success) {
      const pendingInvite = String(localStorage.getItem('hm_pending_invite') || '').trim();
      const hasValidInvite = /^[a-zA-Z0-9_-]+$/.test(pendingInvite);
      const path = hasValidInvite
        ? `/invites/${pendingInvite}`
        : getPostAuthPath(result.user);
      if (pendingInvite) localStorage.removeItem('hm_pending_invite');
      navigate(path, { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGoogleLoginPromise = () => new Promise(async (resolve) => {
    await handleGoogleLogin();
    resolve();
  });

  return (
    <main className="auth-modern">
      <section className="auth-modern__card">
        <h1>Sign in to your account</h1>
        <p className="auth-modern__subtitle">Welcome back! Please enter your details.</p>

        {error ? (
          <div className="auth-modern__error" role="alert" aria-live="polite">
            <span className="auth-modern__error-icon" aria-hidden="true">
              <AlertCircle size={14} />
            </span>
            <span className="auth-modern__error-text">{error}</span>
            <button
              type="button"
              className="auth-modern__error-dismiss"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-modern__form">
          <label>
            Email or username
            <div className="auth-modern__field">
              <Mail size={16} />
              <input
                type="text"
                autoComplete="username"
                placeholder="you@example.com or admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>

          <label>
            <span className="auth-modern__label-row">
              Password
              <Link to="/reset-password" className="auth-modern__forgot">Forgot?</Link>
            </span>
            <div className="auth-modern__field">
              <Lock size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-modern__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <ShinyButton type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </ShinyButton>
        </form>

        <div className="auth-modern__divider"><span>OR</span></div>

        <div className="auth-modern__socials">
          <StatefulButton onClick={handleGoogleLoginPromise} disabled={loading} className="sb-btn--google">
            <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.6 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.6 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.2-11.4-7.7l-6.5 5C9.5 39.4 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.2 5.2C42 35.2 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
            Continue with Google
          </StatefulButton>
        </div>

        <p className="auth-modern__switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </section>
    </main>
  );
}
