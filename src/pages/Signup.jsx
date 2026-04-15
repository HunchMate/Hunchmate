import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'participant' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, googleAuth } = useAuth();
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const googleAllowedOriginsRaw = import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS
    || 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174';

  const normalizeOrigin = useCallback((origin) => String(origin || '').trim().replace(/\/$/, ''), []);

  const googleAllowedOrigins = useMemo(
    () => googleAllowedOriginsRaw
      .split(',')
      .map((item) => normalizeOrigin(item))
      .filter(Boolean),
    [googleAllowedOriginsRaw, normalizeOrigin]
  );

  const isGoogleOriginAllowed = useMemo(() => {
    if (!googleClientId || typeof window === 'undefined') return false;
    return googleAllowedOrigins.includes(normalizeOrigin(window.location.origin));
  }, [googleAllowedOrigins, googleClientId, normalizeOrigin]);

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
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!termsAccepted) {
      setError('Please agree to the Terms and Conditions to continue.');
      return;
    }

    setLoading(true);
    const termsAcceptedAt = new Date().toISOString();

    const result = await signup({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      termsAccepted: true,
      termsAcceptedAt,
    });
    if (result.success) {
      const pendingInvite = localStorage.getItem('hm_pending_invite');
      const path = pendingInvite
        ? `/invites/${pendingInvite}`
        : getPostAuthPath(result.user);
      navigate(path);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError('Google sign-in failed.');
      return;
    }

    if (!termsAccepted) {
      setError('Please agree to the Terms and Conditions to continue.');
      return;
    }

    setLoading(true);
    setError('');
    const termsAcceptedAt = new Date().toISOString();

    const result = await googleAuth(
      credentialResponse.credential,
      form.role,
      {},
      { termsAccepted: true, termsAcceptedAt }
    );
    if (result.success) {
      const pendingInvite = localStorage.getItem('hm_pending_invite');
      const path = pendingInvite
        ? `/invites/${pendingInvite}`
        : getPostAuthPath(result.user);
      navigate(path);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [form.role, getPostAuthPath, googleAuth, navigate, termsAccepted]);

  const googleSignupButton = useMemo(() => {
    if (!googleClientId || !isGoogleOriginAllowed) {
      return (
        <button type="button" disabled>
          Google sign-in unavailable on this origin
        </button>
      );
    }

    return (
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => setError('Google sign-in failed. Verify this origin is added in Google OAuth Authorized JavaScript origins and the client ID matches VITE_GOOGLE_CLIENT_ID.')}
        width="340"
        shape="rectangular"
        text="signup_with"
      />
    );
  }, [googleClientId, handleGoogleSuccess, isGoogleOriginAllowed]);

  return (
    <main className="auth-modern">
      <section className="auth-modern__card">
        <p className="auth-modern__brand">Hunchmate</p>
        <h1>Create your account</h1>
        <p className="auth-modern__subtitle">Choose role in one signup flow and continue.</p>

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
            Full name
            <div className="auth-modern__field">
              <User size={16} />
              <input
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </label>

          <label>
            Email
            <div className="auth-modern__field">
              <Mail size={16} />
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </label>

          <label>
            Password
            <div className="auth-modern__field">
              <Lock size={16} />
              <input
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </label>

          <label>
            Account type
            <div className="auth-modern__roles">
              <button
                type="button"
                className={form.role === 'participant' ? 'active' : ''}
                onClick={() => setForm({ ...form, role: 'participant' })}
              >
                Participant
              </button>
              <button
                type="button"
                className={form.role === 'organizer' ? 'active' : ''}
                onClick={() => setForm({ ...form, role: 'organizer' })}
              >
                Host
              </button>
            </div>
          </label>

          <button type="submit" className="auth-modern__submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          <label className="auth-modern__consent">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setError('');
              }}
            />
            <span>
              I agree to the <Link to="/terms">Terms and Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </span>
          </label>
        </form>

        <div className="auth-modern__divider"><span>OR</span></div>

        <div className="auth-modern__socials">
          {googleSignupButton}
        </div>

        {googleClientId && !isGoogleOriginAllowed ? (
          <p className="auth-modern__subtitle">
            Add {typeof window !== 'undefined' ? window.location.origin : 'this origin'} to Google OAuth allowed origins.
          </p>
        ) : null}

        <p className="auth-modern__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
