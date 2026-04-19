import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, X, Globe, Code } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GrainyGradient from '../components/GrainyGradient';
import './Auth.css';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'participant' });
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    const flags = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString()
    };

    const result = await signup(flags);
    if (result.success) {
      const pendingInvite = localStorage.getItem('hm_pending_invite');
      navigate(pendingInvite ? `/invites/${pendingInvite}` : getPostAuthPath(result.user));
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
    const result = await googleAuth({
      name: form.name.trim() || undefined,
      role: form.role,
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString()
    });
    if (result.success) {
      const pendingInvite = localStorage.getItem('hm_pending_invite');
      navigate(pendingInvite ? `/invites/${pendingInvite}` : getPostAuthPath(result.user));
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
          <Link to="/login" className="auth-modern__toggle-btn">Sign In</Link>
          <button className="auth-modern__toggle-btn active" onClick={() => {}}>Join Community</button>
        </div>

        <h1>Create Account</h1>
        <p className="auth-modern__subtitle">Join thousands of builders in the Hunchmate ecosystem.</p>

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
            <label>Full Name</label>
            <div className="auth-modern__field">
              <User size={18} />
              <input
                type="text"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label>Email Address</label>
            <div className="auth-modern__field">
              <Mail size={18} />
              <input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label>Password</label>
            <div className="auth-modern__field">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label>I want to...</label>
            <div className="auth-modern__roles">
              <div 
                className={`auth-modern__role-card ${form.role === 'participant' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'participant' })}
              >
                <span className="auth-modern__role-name">Participate</span>
              </div>
              <div 
                className={`auth-modern__role-card ${form.role === 'organizer' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'organizer' })}
              >
                <span className="auth-modern__role-name">Organize</span>
              </div>
            </div>
          </div>

          <button type="submit" className="auth-modern__submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <label className="auth-modern__consent">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </span>
          </label>
        </form>

        <div className="auth-modern__divider">or sign up with</div>

        <div className="auth-modern__socials">
          <button type="button" onClick={handleGoogleSignup} disabled={loading}>
            <Globe size={18} /> Google
          </button>
          <button type="button" disabled>
            <Code size={18} /> GitHub
          </button>
        </div>

        <p className="auth-modern__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
