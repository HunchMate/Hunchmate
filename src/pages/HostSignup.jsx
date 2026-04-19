import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import hunchmateLogo from '../../HUNCHMATE - Logo Pack (2).png';

export default function HostSignup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'organizer' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, googleAuth, user } = useAuth();
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

  // If user is already logged in as organizer, redirect to dashboard
  if (user?.role === 'organizer') {
    return <Navigate to="/organizer/dashboard" replace />;
  }

  // If user is logged in as participant, show upgrade message
  if (user?.role === 'participant') {
    return (
      <main className="auth-modern">
        <section className="auth-modern__card">
        <div className="flex justify-center w-full mb-6 relative left-[-8px]">
          <img
            src={hunchmateLogo}
            alt="HunchMate Dashboard"
            className="h-10 object-contain drop-shadow-md"
            style={{ transform: 'scale(1.4)' }}
          />
        </div>
          <h1>Create a Host Account</h1>
          <p className="auth-modern__subtitle">
            Your current account is set up as a Participant. To host events, you'll need to create a separate Host account.
          </p>

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#f0f4ff',
              borderLeft: '4px solid #6366f1',
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', color: '#4f46e5', lineHeight: '1.5' }}>
              <strong>Next steps:</strong>
              <br />
              1. Log out from your current account
              <br />
              2. Sign up again with the same or different email
              <br />
              3. Select "Host" during registration
              <br />
              4. Complete host onboarding
            </p>
          </div>

          <Link to="/events" className="auth-modern__submit" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            Return to Events
          </Link>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666' }}>
            <Link to="/" style={{ color: '#6366f1', cursor: 'pointer' }}>
              Go back to Home
            </Link>
          </p>
        </section>
      </main>
    );
  }

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
      role: 'organizer',
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

  const handleGoogleSignup = async () => {
    setError('');

    if (!termsAccepted) {
      setError('Please agree to the Terms and Conditions to continue.');
      return;
    }

    setLoading(true);
    const termsAcceptedAt = new Date().toISOString();
    const result = await googleAuth({
      name: form.name.trim() || undefined,
      role: 'organizer',
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

  return (
    <main className="auth-modern">
      <section className="auth-modern__card">
        <div className="flex justify-center w-full mb-6 relative left-[-8px]">
          <img
            src={hunchmateLogo}
            alt="HunchMate Dashboard"
            className="h-10 object-contain drop-shadow-md"
            style={{ transform: 'scale(1.4)' }}
          />
        </div>
        <h1>Host Events</h1>
        <p className="auth-modern__subtitle">Create your host account and start organizing amazing events.</p>

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

          <button type="submit" className="auth-modern__submit auth-modern__submit--icon" disabled={loading}>
            <span className="auth-modern__submit-label">
              {loading ? 'Creating account...' : 'Create Host Account'}
            </span>
            {!loading && <ArrowRight size={16} className="auth-modern__submit-icon" />}
          </button>

          <div className="auth-modern__divider">or continue with</div>
          <div className="auth-modern__socials">
            <button type="button" onClick={handleGoogleSignup} disabled={loading}>
              Continue with Google
            </button>
          </div>

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

        <p className="auth-modern__switch">
          Want to explore events as a participant instead? <Link to="/events">Browse Events</Link>
        </p>
      </section>
    </main>
  );
}
