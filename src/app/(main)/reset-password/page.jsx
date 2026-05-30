'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@/utils/router';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowLeft, Mail, CheckCircle2, KeyRound, X, Lock } from 'lucide-react';
import GrainyGradient from '@/components/GrainyGradient';
import { createClient } from '@/utils/supabase/client';
import '@/vite-pages/Auth.css';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if URL has recovery token
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      
      // Supabase clears the hash, so we also check for the query param we added to redirectTo
      if ((hash && hash.includes('type=recovery')) || (search && search.includes('mode=recovery'))) {
        setIsRecoveryMode(true);
      }
      
      // Also listen to auth state changes in case the hash is processed quickly
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleRequestReset = async (e) => {
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

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Failed to update password');
    } else {
      setSuccess(true);
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
          <h1>{isRecoveryMode ? 'Set New Password' : 'Recover Access'}</h1>
          <p className="auth-modern__subtitle">
            {isRecoveryMode 
              ? 'Please enter your new password below.' 
              : 'Enter your email to receive a secure reset link.'}
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

        {success && !isRecoveryMode ? (
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
        ) : success && isRecoveryMode ? (
          <div style={{ 
            background: 'rgba(34, 197, 94, 0.05)', 
            border: '1.5px solid rgba(34, 197, 94, 0.2)',
            padding: '24px',
            borderRadius: '16px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <CheckCircle2 size={40} style={{ color: '#22c55e', marginBottom: '12px' }} />
            <p style={{ fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Password Updated!</p>
            <p style={{ fontSize: '0.9rem', color: '#166534', opacity: 0.8 }}>Your password has been changed successfully.</p>
            <button 
              onClick={() => navigate('/login')}
              className="auth-modern__submit"
              style={{ marginTop: '16px' }}
            >
              Continue to Sign In
            </button>
          </div>
        ) : isRecoveryMode ? (
          <form className="auth-modern__form" onSubmit={handleUpdatePassword}>
            <div>
              <label>New Password</label>
              <div className="auth-modern__field">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <label>Confirm Password</label>
              <div className="auth-modern__field">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-modern__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        ) : (
          <form className="auth-modern__form" onSubmit={handleRequestReset}>
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

        {(!success || !isRecoveryMode) && (
          <p className="auth-modern__switch">
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
