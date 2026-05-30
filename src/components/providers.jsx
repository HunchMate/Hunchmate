'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { EventProvider } from '../context/EventContext';
import ToastContainer from './ui/ToastContainer';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <EventProvider>
        {children}
        <ToastContainer />
      </EventProvider>
    </AuthProvider>
  );
}

