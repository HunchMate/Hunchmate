import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    e.preventDefault();
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
      if (pendingInvite) {
        localStorage.removeItem('hm_pending_invite');
      }
      navigate(path, { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

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
      if (pendingInvite) {
        localStorage.removeItem('hm_pending_invite');
      }
      navigate(path, { replace: true });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

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
              <Link to="/login" className="auth-modern__forgot">Forgot?</Link>
            </span>
            <div className="auth-modern__field">
              <Lock size={16} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>

          <button type="submit" className="auth-modern__submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-modern__divider"><span>OR</span></div>

        <div className="auth-modern__socials">
          <button type="button" onClick={handleGoogleLogin} disabled={loading}>
            Continue with Google
          </button>
        </div>

        <p className="auth-modern__switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </section>
    </main>
  );
}
