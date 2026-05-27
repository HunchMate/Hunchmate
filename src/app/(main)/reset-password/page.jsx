'use client';

import { useState } from 'react';
import { Link } from '@/utils/router';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowLeft, Mail, CheckCircle2, KeyRound, X } from 'lucide-react';
import GrainyGradient from '@/components/GrainyGradient';
import '@/vite-pages/Auth.css';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    if (!email) {
      setErrorMsg('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setEmail('');
    } else {
      setErrorMsg(result.error || 'Failed to send reset email');
    }
  };

  return (
    <main className="auth-modern">
      <GrainyGradient />
      
      <section className="auth-modern__card animate-fade-in-up">
        <div className="auth-modern__header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '24px',
            background: 'rgba(234, 122, 50, 0.05)',
            border: '1.5px solid rgba(234, 122, 50, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <KeyRound size={48} style={{ color: '#ea7a32' }} />
          </div>
          <h1>Recover Access</h1>
          <p className="auth-modern__subtitle">
            Enter your email to receive a secure reset link.
          </p>
        </div>

        {errorMsg ? (
          <div className="auth-modern__error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
            <button className="auth-modern__error-dismiss" onClick={() => setErrorMsg('')}>
              <X size={16} />
            </button>
          </div>
        ) : null}

        {success ? (
          <div style={{ 
            background: 'rgba(34, 197, 94, 0.05)', 
            border: '1.5px solid rgba(34, 197, 94, 0.2)',
            padding: '24px',
            borderRadius: '16px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <CheckCircle2 size={40} style={{ color: '#22c55e', marginBottom: '12px' }} />
            <p style={{ fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Email Sent!</p>
            <p style={{ fontSize: '0.9rem', color: '#166534', opacity: 0.8 }}>Check your inbox for further instructions.</p>
          </div>
        ) : (
          <form className="auth-modern__form" onSubmit={handleSubmit}>
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

            <button 
              type="submit" 
              className="auth-modern__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Send Recovery Link'}
            </button>
          </form>
        )}

        <p className="auth-modern__switch">
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </p>
      </section>
    </main>
  );
}
