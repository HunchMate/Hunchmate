'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function getRedirectPath(role) {
  if (role === 'organizer' || role === 'admin') return '/organizer/create-event';
  return '/host-signup';
}

export default function HostEventRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Try to redirect immediately using the cached user (avoids waiting for Supabase)
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('authUser');
        if (cached) {
          const cachedUser = JSON.parse(cached);
          router.replace(getRedirectPath(cachedUser?.role));
          return;
        }
      } catch {
        // Ignore malformed cache and fall through to auth state
      }
    }

    // No cache — wait for auth state to resolve
    if (loading) return;
    if (!user) {
      router.replace('/host-signup');
    } else {
      router.replace(getRedirectPath(user.role));
    }
  }, [user, loading, router]);

  // Show a minimal spinner while redirecting
  return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9ff' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
