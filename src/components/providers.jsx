'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { EventProvider } from '../context/EventContext';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <EventProvider>
        {children}
      </EventProvider>
    </AuthProvider>
  );
}
