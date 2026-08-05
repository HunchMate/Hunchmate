'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';

export default function MainLayout({ children }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const isEventDetailPage = pathname.includes('/events/') && pathname.split('/').length > 2;

  // Global Onboarding Check
  useEffect(() => {
    if (loading || !user) return;

    // We don't want to redirect them if they're already on the correct page or logging out
    if (pathname.includes('/onboarding') || pathname.includes('/host-onboarding')) return;

    const isOrganizer = user.role === 'organizer';
    const isParticipant = user.role !== 'admin' && user.role !== 'organizer';

    if (isOrganizer && !user.hostOnboardingCompleted) {
      router.replace('/host-onboarding');
    } else if (isParticipant && !user.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [user, loading, pathname, router]);

  return (
    <>
      {!isEventDetailPage && <SiteHeader />}
      <main className="page-transition" style={{ flex: 1 }}>
        {children}
      </main>
      {!isEventDetailPage && <Footer />}
    </>
  );
}
