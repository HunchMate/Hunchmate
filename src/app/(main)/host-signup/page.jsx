'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from '@/utils/router';
import { Mail, Lock, User, Phone, AlertCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Checkbox from '@/components/ui/Checkbox';
import { ShinyButton } from '@/components/ui/ShinyButton';
import '@/vite-pages/Auth.css';
import hunchmateLogo from '@/../HUNCHMATE - Logo Pack (2).png';

export default function HostSignup() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'organizer' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, googleAuth, user } = useAuth();
  const navigate = useNavigate();

  const getPostAuthPath = useCallback((nextUser) => {
    if (nextUser?.role === 'admin') return '/admin/dashboard';
    if (nextUser?.role === 'organizer') {
      // For organizers, check hostOnboardingCompleted (not participant onboardingCompleted)
      return nextUser?.hostOnboardingCompleted ? '/organizer/dashboard' : '/host-onboarding';
    }
    return !nextUser?.onboardingCompleted ? '/onboarding' : '/events';
  }, []);

  // Force fresh reload on bfcache restore or back navigation after OAuth redirect
  useEffect(() => {
    const checkAndReload = () => {
      if (sessionStorage.getItem('hm_oauth_redirect')) {
        sessionStorage.removeItem('hm_oauth_redirect');
        window.location.reload();
      }
    };
    // Check on mount (for normal back navigation)
    checkAndReload();
    // Check on pageshow (for bfcache restore)
    window.addEventListener('pageshow', checkAndReload);
    return () => window.removeEventListener('pageshow', checkAndReload);
  }, []);

  if (user?.role === 'organizer') {
    return <Navigate to="/organizer/dashboard" replace />;
  }

  if (user?.role === 'participant') {
    return (
      <main className="auth-modern">
        <section className="auth-modern__card">
          <h1>Create a Host Account</h1>
          <p className="auth-modern__subtitle">
            Your current account is set up as a Participant. To host events, you'll need a separate Host account.
          </p>
          <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', backgroundColor: '#f0f4ff', borderLeft: '4px solid #6366f1' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#4f46e5', lineHeight: '1.5' }}>
              <strong>Next steps:</strong><br />
              1. Log out from your current account<br />
              2. Sign up again with the same or different email<br />
              3. Select &quot;Host&quot; during registration<br />
              4. Complete host onboarding
            </p>
          </div>
          <Link to="/events" className="auth-modern__submit" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', marginTop: '16px' }}>
            Return to Events
          </Link>
        </section>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields.');
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
      role: 'organizer',
      phoneNumber: form.phone.trim(),
      termsAccepted: true,
      termsAcceptedAt,
    });

    if (result.success) {
      const pendingInvite = localStorage.getItem('hm_pending_invite');
      // Use hard redirect (full reload) to avoid race conditions with onAuthStateChange
      // reading a stale DB profile and overwriting the user state mid-navigation.
      window.location.replace(pendingInvite ? `/invites/${pendingInvite}` : getPostAuthPath(result.user));
      return;
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setError('');
    if (!termsAccepted) {
      setError('Please agree to the Terms and Conditions to continue.');
      return;
    }
    setLoading(true);
    try {
      const termsAcceptedAt = new Date().toISOString();
      sessionStorage.setItem('hm_oauth_redirect', '1'); // for bfcache detection on back button
      localStorage.setItem('hm_google_signup_role', 'organizer');
      document.cookie = `hm_google_signup_role=organizer; path=/; max-age=600; SameSite=Lax`;
      const result = await googleAuth({
        name: form.name.trim() || undefined,
        role: 'organizer',
        termsAccepted: true,
        termsAcceptedAt,
      });
      if (result.success) {
        if (result.user) {
          const pendingInvite = localStorage.getItem('hm_pending_invite');
          navigate(pendingInvite ? `/invites/${pendingInvite}` : getPostAuthPath(result.user));
          return;
        }
        return; // OAuth in progress — Google redirect is handling it
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err?.message || 'Google sign-up failed. Please try again.');
    } finally {
      setLoading(false); // Always reset so form stays usable on back-button or failure
    }
  };

  return (
    <main className="auth-modern">
      <section className="auth-modern__card">
        <h1>Host Events</h1>
        <p className="auth-modern__subtitle">Create your host account and start organizing amazing events.</p>

        {error ? (
          <div className="auth-modern__error" role="alert" aria-live="polite">
            <span className="auth-modern__error-icon" aria-hidden="true"><AlertCircle size={14} /></span>
            <span className="auth-modern__error-text">{error}</span>
            <button type="button" className="auth-modern__error-dismiss" onClick={() => setError('')} aria-label="Dismiss error">
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
            Work email
            <div className="auth-modern__field">
              <Mail size={16} />
              <input
                type="email"
                placeholder="you@organisation.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </label>

          <label>
            Mobile number
            <div className="auth-modern__field">
              <Phone size={16} />
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </label>

          <label>
            Password
            <div className="auth-modern__field">
              <Lock size={16} />
              <input
                type="password"
                placeholder="Create a password (min. 8 characters)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </label>

          <div className="auth-modern__consent">
            <Checkbox
              id="hostsignup-terms"
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

          <ShinyButton type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Host Account'}
          </ShinyButton>

          <div className="auth-modern__divider">or continue with</div>
          <div className="auth-modern__socials">
            <button type="button" onClick={handleGoogleSignup} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.6 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.6 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.2-11.4-7.7l-6.5 5C9.5 39.4 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.2 5.2C42 35.2 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </form>

        <p className="auth-modern__switch">
          Already have a host account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
