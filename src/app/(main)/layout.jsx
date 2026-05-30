'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/layout/Footer';

export default function MainLayout({ children }) {
  const pathname = usePathname() || '';
  const isEventDetailPage = pathname.includes('/events/') && pathname.split('/').length > 2;

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
