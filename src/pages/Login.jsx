import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, X, ChevronRight, Hash, Globe, Code } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GrainyGradient from '../components/GrainyGradient';
import './Auth.css';

const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => String(value || '').trim().toLowerCase())
  .filter(Boolean);

function resolveLoginIdentity(rawIdentity) {
  const value = String(rawIdentity || '').trim().toLowerCase();
  if (!value) return '';
  if (value.includes('@')) return value;
  if (value === 'admin' && ADMIN_EMAILS.length > 0) return ADMIN_EMAILS[0];
  return value;
}

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
    
    return nextUser.role === 'organizer' ? '/organizer/dashboard' : '/events';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedIdentity = resolveLoginIdentity(email);
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

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const result = await googleAuth();
    if (result.success) {
      const pendingInvite = String(localStorage.getItem('hm_pending_invite') || '').trim();
      const path = pendingInvite && /^[a-zA-Z0-9_-]+$/.test(pendingInvite)
        ? `/invites/${pendingInvite}`
        : getPostAuthPath(result.user);
      if (pendingInvite) localStorage.removeItem('hm_pending_invite');
      navigate(path, { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <main className="auth-modern">
      <GrainyGradient />
      
      <section className="auth-modern__card animate-fade-in-up">
        <div className="auth-modern__toggle">
          <button className="auth-modern__toggle-btn active" onClick={() => {}}>Sign In</button>
          <Link to="/signup" className="auth-modern__toggle-btn">Join Community</Link>
        </div>

        <h1>Welcome Back</h1>
        <p className="auth-modern__subtitle">Enter your details to access your dashboard.</p>

        {error ? (
          <div className="auth-modern__error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="auth-modern__error-dismiss" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-modern__form">
          <div>
            <label>Email Address</label>
            <div className="auth-modern__field">
              <Mail size={18} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <div className="auth-modern__label-row">
              <label>Password</label>
              <Link to="/reset-password" title="Forgot password?" className="auth-modern__forgot">Forgot?</Link>
            </div>
            <div className="auth-modern__field">
              <Lock size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-modern__submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-modern__divider">or continue with</div>
        
        <div className="auth-modern__socials">
          <button type="button" onClick={handleGoogleSignIn} disabled={loading}>
            <Globe size={18} /> Google
          </button>
          <button type="button" disabled>
            <Code size={18} /> GitHub
          </button>
        </div>

        <p className="auth-modern__switch">
          New to HunchMate? <Link to="/signup">Create account</Link>
        </p>
      </section>
    </main>
  );
}
