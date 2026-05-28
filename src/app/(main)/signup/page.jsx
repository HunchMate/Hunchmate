'use client';

import { useCallback, useState } from 'react';
import { Link, useNavigate } from '@/utils/router';
import { Mail, Lock, User, AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Checkbox from '@/components/ui/Checkbox';
import StatefulButton from '@/components/ui/StatefulButton';
import '@/vite-pages/Auth.css';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'participant' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, googleAuth } = useAuth();
  const navigate = useNavigate();

  const getPostAuthPath = useCallback((nextUser) => {
    if (nextUser?.role === 'admin') return '/admin/dashboard';
    if (!nextUser?.onboardingCompleted) {
      return nextUser?.role === 'organizer' ? '/host-onboarding' : '/onboarding';
    }
    return nextUser.role === 'organizer' ? '/organizer/dashboard' : '/events';
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
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
      navigate(pendingInvite ? `/invites/${pendingInvite}` : getPostAuthPath(result.user));
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleSubmitPromise = () => new Promise((resolve, reject) => {
    handleSubmit()
      .then(resolve)
      .catch((err) => {
        console.error("Signup unhandled error:", err);
        setError(err?.message || "An unexpected error occurred");
        reject(err);
      });
  });

  const handleGoogleSignup = async () => {
    setError('');
    if (!termsAccepted) {
      setError('Please agree to the Terms and Conditions to continue.');
      return;
    }
    setLoading(true);
    const termsAcceptedAt = new Date().toISOString();
    const result = await googleAuth({
      role: form.role,
      termsAccepted: true,
      termsAcceptedAt,
    });
    if (result.success) {
      const pendingInvite = localStorage.getItem('hm_pending_invite');
      navigate(pendingInvite ? `/invites/${pendingInvite}` : getPostAuthPath(result.user));
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGoogleSignupPromise = () => new Promise(async (resolve) => {
    await handleGoogleSignup();
    resolve();
  });

  return (
    <main className="auth-modern">
      <section className="auth-modern__card">
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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

          <label>
            Account type
            <div className="auth-modern__roles">
              <button
                type="button"
                className={form.role === 'participant' ? 'active--participant' : ''}
                onClick={() => setForm({ ...form, role: 'participant' })}
              >
                Participant
              </button>
              <button
                type="button"
                className={form.role === 'organizer' ? 'active--host' : ''}
                onClick={() => setForm({ ...form, role: 'organizer' })}
              >
                Host
              </button>
            </div>
          </label>

          <StatefulButton onClick={handleSubmitPromise} disabled={loading}>
            Sign up
          </StatefulButton>

          <div className="auth-modern__consent">
            <Checkbox
              id="signup-terms"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setError('');
              }}
              label={
                <span>
                  I agree to the <Link to="/terms">Terms and Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.
                </span>
              }
            />
          </div>
        </form>

        <div className="auth-modern__divider"><span>OR</span></div>

        <div className="auth-modern__socials">
          <StatefulButton onClick={handleGoogleSignupPromise} disabled={loading} className="sb-btn--google">
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
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
