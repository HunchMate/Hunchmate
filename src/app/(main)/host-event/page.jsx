'use client';

import { useEffect } from 'react';
import { useNavigate } from '@/utils/router';
import { useAuth } from '@/context/AuthContext';

export default function HostEventRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // If not logged in, go to host signup
      navigate('/host-signup');
    } else if (user.role === 'organizer' || user.role === 'admin') {
      // If host/organizer, go to create event page
      navigate('/organizer/create-event');
    } else {
      // If participant, go to host signup which displays the upgrade instructions card
      navigate('/host-signup');
    }
  }, [user, loading, navigate]);

  return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19' }}>
      <div className="animate-pulse" style={{ color: '#ea7a32', fontSize: '1.25rem', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        Redirecting...
      </div>
    </main>
  );
}
